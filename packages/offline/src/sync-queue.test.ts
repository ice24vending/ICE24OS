import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import {
  Ice24OfflineDatabase,
  readProtectedRecord,
  saveOfflineBundle,
  synchronizeNext,
  retryQueuedOperation,
} from "./index.js";
const owner = { accountId: "account", userId: "user" };
const databases: Ice24OfflineDatabase[] = [];
const database = () => {
  const db = new Ice24OfflineDatabase(crypto.randomUUID());
  databases.push(db);
  return db;
};
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});
async function enqueue(db: Ice24OfflineDatabase, id: string, dependencies: string[] = []) {
  const now = Date.now();
  await saveOfflineBundle(
    db,
    [
      {
        store: "operations",
        input: {
          ...owner,
          id,
          orderId: "order",
          packageVersion: 1,
          downloadedAt: now,
          expiresAt: now + 3600_000,
        },
        payload: new Blob([JSON.stringify({ id })]),
      },
    ],
    {
      ...owner,
      id,
      action: "test",
      state: "pending",
      createdAt: new Date(now).toISOString(),
      dependencies,
    },
  );
}
it("atomically stores encrypted payload and queue, rolling back invalid dependencies", async () => {
  const db = database();
  await expect(enqueue(db, "closure", ["absent"])).rejects.toThrow();
  expect(await db.operations.count()).toBe(0);
  expect(await db.pendingOperations.count()).toBe(0);
  await enqueue(db, "photo");
  expect(
    JSON.parse(await (await readProtectedRecord(db, "operations", owner, "photo"))!.text()),
  ).toEqual({ id: "photo" });
});
it("sends files before closure and prevents simultaneous tab delivery", async () => {
  const db = database();
  await enqueue(db, "photo");
  await enqueue(db, "closure", ["photo"]);
  const transport = vi.fn(async () => ({
    status: "accepted" as const,
    value: { fileId: "verified" },
  }));
  await Promise.all([synchronizeNext(db, owner, transport), synchronizeNext(db, owner, transport)]);
  expect(transport).toHaveBeenCalledTimes(1);
  await synchronizeNext(db, owner, transport);
  expect(transport).toHaveBeenCalledTimes(2);
  expect((await db.pendingOperations.get("closure"))?.state).toBe("loaded");
});
it("retains operation id after lost response and resumes an abandoned claim", async () => {
  const db = database();
  await enqueue(db, "operation");
  await synchronizeNext(db, owner, async () => {
    throw new Error("Respuesta perdida");
  });
  expect((await db.pendingOperations.get("operation"))?.state).toBe("failed");
  await db.pendingOperations.update("operation", { state: "synchronizing", claimedUntil: 0 });
  const transport = vi.fn(async (op: { id: string }) => ({
    status: "accepted" as const,
    value: op.id,
  }));
  await synchronizeNext(db, owner, transport);
  expect(transport.mock.calls[0]?.[0].id).toBe("operation");
  expect((await db.pendingOperations.get("operation"))?.attempts).toBe(2);
});
it("does not send another owner's operation or automatically retry conflicts", async () => {
  const db = database();
  await enqueue(db, "operation");
  const transport = vi.fn(async () => ({
    status: "conflict" as const,
    message: "Versión distinta",
  }));
  expect(await synchronizeNext(db, { ...owner, userId: "other" }, transport)).toBe(false);
  await synchronizeNext(db, owner, transport);
  expect(await synchronizeNext(db, owner, transport)).toBe(false);
  expect(transport).toHaveBeenCalledTimes(1);
});
it("bounds retries with backoff and preserves the id when explicitly retried", async () => {
  const db = database();
  await enqueue(db, "retry");
  const transport = vi.fn(async () => ({
    status: "retryable_error" as const,
    message: "Servidor no disponible",
  }));
  let now = Date.now();
  for (let i = 0; i < 5; i++) {
    expect(await synchronizeNext(db, owner, transport, now)).toBe(true);
    const op = (await db.pendingOperations.get("retry"))!;
    expect(op.nextAttemptAt!).toBeGreaterThan(now);
    expect(await synchronizeNext(db, owner, transport, now)).toBe(false);
    now = op.nextAttemptAt!;
  }
  expect(await synchronizeNext(db, owner, transport, now)).toBe(false);
  expect(transport).toHaveBeenCalledTimes(5);
  await retryQueuedOperation(db, owner, "retry");
  expect((await db.pendingOperations.get("retry"))?.id).toBe("retry");
  expect((await db.pendingOperations.get("retry"))?.attempts).toBe(0);
});
it("does not claim operations owned by another module", async () => {
  const db = database();
  await enqueue(db, "template-action");
  const transport = vi.fn();
  expect(await synchronizeNext(db, owner, transport, Date.now(), ["work-order-close"])).toBe(false);
  expect(transport).not.toHaveBeenCalled();
  expect((await db.pendingOperations.get("template-action"))?.attempts).toBeUndefined();
});
it("allows manual recovery after a browser crash on the final automatic attempt", async () => {
  const db = database();
  await enqueue(db, "last-attempt");
  await db.pendingOperations.update("last-attempt", {
    state: "synchronizing",
    attempts: 5,
    claimedUntil: 0,
  });
  const transport = vi.fn(async (op: { id: string }) => ({
    status: "accepted" as const,
    value: op.id,
  }));
  expect(await synchronizeNext(db, owner, transport)).toBe(false);
  expect(transport).not.toHaveBeenCalled();
  expect(await db.pendingOperations.get("last-attempt")).toMatchObject({
    state: "failed",
    terminal: true,
  });
  await retryQueuedOperation(db, owner, "last-attempt");
  expect(await synchronizeNext(db, owner, transport)).toBe(true);
  expect(transport.mock.calls[0]?.[0].id).toBe("last-attempt");
});
it("preserves expired payloads as conflicts without sending them", async () => {
  const db = database();
  await enqueue(db, "expired");
  const transport = vi.fn();
  await synchronizeNext(db, owner, transport, Date.now() + 3600_001);
  expect(transport).not.toHaveBeenCalled();
  expect((await db.pendingOperations.get("expired"))?.state).toBe("conflict");
  expect(await db.operations.count()).toBe(1);
});
