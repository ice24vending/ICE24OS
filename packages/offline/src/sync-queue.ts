import type { Ice24OfflineDatabase, PendingOperation } from "./index.js";
import {
  readProtectedRecord,
  prepareProtectedRecord,
  commitProtectedRecords,
  OfflineStorageError,
  type OfflineMetadata,
  type OfflineOwner,
  type OfflineStore,
} from "./protected-store.js";
export type RecordInput = Omit<OfflineMetadata, "key" | "scope"> & { id: string };
export interface ProtectedWrite {
  store: OfflineStore;
  input: RecordInput;
  payload: Blob;
}
/** Encrypt before opening the write transaction, then commit payloads and queue atomically. */
export async function saveOfflineBundle(
  db: Ice24OfflineDatabase,
  writes: ProtectedWrite[],
  operation?: PendingOperation,
): Promise<void> {
  const prepared = await Promise.all(
    writes.map((write) => prepareProtectedRecord(db, write.store, write.input, write.payload)),
  );
  await db.transaction("rw", db.tables, async () => {
    await commitProtectedRecords(db, prepared);
    if (operation) {
      const existing = await db.pendingOperations.get(operation.id);
      if (existing) throw new Error("La operación ya existe; conserva su contenido original.");
      if (
        !operation.userId ||
        !writes.some(
          (w) =>
            w.store === "operations" &&
            w.input.id === operation.id &&
            w.input.userId === operation.userId &&
            w.input.accountId === operation.accountId,
        )
      )
        throw new Error("La cola requiere un contenido protegido del mismo usuario.");
      if (operation.dependencies?.includes(operation.id)) throw new Error("Dependencia circular.");
      for (const id of operation.dependencies ?? []) {
        const dependency = await db.pendingOperations.get(id);
        if (
          !dependency ||
          dependency.userId !== operation.userId ||
          dependency.accountId !== operation.accountId
        )
          throw new Error("Dependencia inexistente o de otro contexto.");
      }
      await db.pendingOperations.add(operation);
    }
  });
}
export type QueueResult =
  | { status: "accepted"; value: unknown }
  | { status: "retryable_error" | "permanent_error" | "conflict"; message: string };
export type QueueTransport = (
  operation: PendingOperation,
  payload: unknown,
  dependencies: ReadonlyMap<string, unknown>,
) => Promise<QueueResult>;
const owns = (op: PendingOperation, owner: OfflineOwner) =>
  op.accountId === owner.accountId && op.userId === owner.userId;
export const retryDelay = (attempt: number, random = Math.random) =>
  Math.min(300_000, 1000 * 2 ** Math.min(attempt, 8)) * (0.75 + random() * 0.5);
/** One operation per call; transactional claims coordinate tabs and expire after crashes. */
export async function synchronizeNext(
  db: Ice24OfflineDatabase,
  owner: OfflineOwner,
  transport: QueueTransport,
  now = Date.now(),
  actions?: readonly string[],
): Promise<boolean> {
  const claimId = crypto.randomUUID();
  const op = await db.transaction("rw", db.pendingOperations, async () => {
    const rows = (
      await db.pendingOperations.where("accountId").equals(owner.accountId).sortBy("createdAt")
    ).filter((r) => owns(r, owner));
    // A browser crash on the last attempt must expose a manual retry, not leave
    // an expired claim permanently labelled as synchronizing.
    for (const row of rows) {
      if (
        (!actions || actions.includes(row.action)) &&
        row.state === "synchronizing" &&
        (row.claimedUntil ?? 0) <= now &&
        (row.attempts ?? 0) >= 5
      ) {
        await db.pendingOperations.put({
          ...row,
          state: "failed",
          claimedUntil: 0,
          terminal: true,
          error:
            "El último intento se interrumpió. Reintenta para comprobar el resultado sin duplicarlo.",
        });
      }
    }
    const next = rows.find(
      (r) =>
        (!actions || actions.includes(r.action)) &&
        !r.terminal &&
        (r.attempts ?? 0) < 5 &&
        (((r.state === "pending" || r.state === "failed") && (r.nextAttemptAt ?? 0) <= now) ||
          (r.state === "synchronizing" && (r.claimedUntil ?? 0) <= now)) &&
        (r.dependencies ?? []).every((id) => rows.some((d) => d.id === id && d.state === "loaded")),
    );
    if (!next) return undefined;
    const claimed: PendingOperation = {
      ...next,
      state: "synchronizing",
      attempts: (next.attempts ?? 0) + 1,
      claimId,
      claimedUntil: now + 120_000,
    };
    await db.pendingOperations.put(claimed);
    return claimed;
  });
  if (!op) return false;
  let result: QueueResult;
  let metadata: RecordInput | undefined;
  try {
    const key = JSON.stringify([owner.accountId, owner.userId, op.id]);
    const record = await db.operations.get(key);
    if (!record) throw new Error("Contenido local no disponible.");
    metadata = { ...record, id: `${op.id}:result` };
    const blob = await readProtectedRecord(db, "operations", owner, op.id, now);
    if (!blob) throw new Error("Contenido local no disponible.");
    const dependencies = new Map<string, unknown>();
    for (const id of op.dependencies ?? []) {
      const dependency = await readProtectedRecord(db, "operations", owner, `${id}:result`, now);
      if (!dependency) throw new Error("No se encontró el resultado del archivo previo.");
      dependencies.set(id, JSON.parse(await dependency.text()));
    }
    result = await transport(op, JSON.parse(await blob.text()), dependencies);
  } catch (error) {
    result = {
      status:
        error instanceof OfflineStorageError
          ? error.code === "expired"
            ? "conflict"
            : "permanent_error"
          : "retryable_error",
      message: error instanceof Error ? error.message : "Conexión interrumpida.",
    };
  }
  const preparedResult =
    result.status === "accepted" && metadata
      ? await prepareProtectedRecord(
          db,
          "operations",
          metadata,
          new Blob([JSON.stringify(result.value)], { type: "application/json" }),
        )
      : undefined;
  await db.transaction("rw", db.tables, async () => {
    const current = await db.pendingOperations.get(op.id);
    if (!current || !owns(current, owner) || current.claimId !== claimId) return;
    if (result.status === "accepted" && preparedResult) {
      await commitProtectedRecords(db, [preparedResult]);
      await db.pendingOperations.put({ ...op, state: "loaded", claimedUntil: 0 });
    } else {
      const failed =
        result.status === "accepted"
          ? { status: "permanent_error" as const, message: "Resultado local no disponible." }
          : result;
      await db.pendingOperations.put({
        ...op,
        state: failed.status === "conflict" ? "conflict" : "failed",
        claimedUntil: 0,
        terminal: failed.status !== "retryable_error" || (op.attempts ?? 0) >= 5,
        error: failed.message,
        nextAttemptAt: now + retryDelay(op.attempts ?? 1),
      });
    }
  });
  return true;
}
export async function retryQueuedOperation(
  db: Ice24OfflineDatabase,
  owner: OfflineOwner,
  id: string,
): Promise<void> {
  await db.transaction("rw", db.pendingOperations, async () => {
    const op = await db.pendingOperations.get(id);
    if (!op || !owns(op, owner) || op.state !== "failed")
      throw new Error("La operación no se puede reintentar.");
    await db.pendingOperations.put({
      ...op,
      state: "pending",
      attempts: 0,
      nextAttemptAt: 0,
      terminal: false,
    });
  });
}
