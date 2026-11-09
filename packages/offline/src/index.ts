import Dexie, { liveQuery, type EntityTable } from "dexie";

export const OFFLINE_DATABASE_NAME = "ice24-private";
export const OFFLINE_SCHEMA_VERSION = 2;

export interface PendingOperation {
  /** Also the idempotency key: every send of this operation reuses it, so a retry never duplicates. */
  readonly id: string;
  readonly accountId: string;
  /** Absent only on quarantined v1 records; never inferred during migration. */
  readonly userId?: string;
  readonly action: string;
  readonly createdAt: string;
  readonly expectedVersion?: number;
  readonly state: "pending" | "synchronizing" | "loaded" | "failed" | "conflict" | "resolved";
  readonly dependencies?: readonly string[];
  readonly nextAttemptAt?: number;
  readonly claimId?: string;
  readonly claimedUntil?: number;
  readonly terminal?: boolean;
  readonly error?: string;
  readonly conflictId?: string;
  /** Page where the person reviews and sends it («Ver pendientes»). Not indexed. */
  readonly href?: string;
  /** Number of send attempts (UI_UX §20.5). Not indexed. */
  readonly attempts?: number;
}

export class Ice24OfflineDatabase extends Dexie {
  public readonly pendingOperations!: EntityTable<PendingOperation, "id">;
  public readonly orders!: EntityTable<ProtectedRecord, "key">;
  public readonly drafts!: EntityTable<ProtectedRecord, "key">;
  public readonly evidence!: EntityTable<ProtectedRecord, "key">;
  public readonly operations!: EntityTable<ProtectedRecord, "key">;
  public readonly metadata!: EntityTable<OfflineMetadata, "key">;
  public readonly keys!: EntityTable<LocalKey, "key">;

  public constructor(name = OFFLINE_DATABASE_NAME) {
    super(name);
    this.version(1).stores({
      pendingOperations: "&id, accountId, state, createdAt",
    });
    // Keep v1 rows intact, but invisible without a verified owner. No destructive migration.
    this.version(2).stores({
      pendingOperations: "&id, accountId, userId, state, createdAt",
      orders: "&key, scope, orderId, expiresAt",
      drafts: "&key, scope, orderId, expiresAt",
      evidence: "&key, scope, orderId, expiresAt",
      operations: "&key, scope, orderId, expiresAt",
      metadata: "&key, scope, expiresAt",
      keys: "&key",
    });
  }
}

export interface ProtectedLocalStore {
  clear(): Promise<void>;
}

export const clearProtectedLocalData = async (store: ProtectedLocalStore): Promise<void> => {
  await store.clear();
};

/** Saves (or replaces, by id) an operation in the local queue. */
export const queueOperation = async (
  db: Ice24OfflineDatabase,
  operation: PendingOperation,
): Promise<void> => {
  if (!operation.userId || !operation.accountId) throw new Error("Verified local owner required");
  await db.transaction("rw", db.pendingOperations, async () => {
    const existing = await db.pendingOperations.get(operation.id);
    if (
      existing &&
      (existing.accountId !== operation.accountId || existing.userId !== operation.userId)
    )
      throw new Error("Local operation belongs to another context");
    await db.pendingOperations.put(operation);
  });
};

/** Pending operations of one account, oldest first. */
export const pendingOperationsOf = (
  db: Ice24OfflineDatabase,
  accountId: string,
  userId?: string,
): Promise<PendingOperation[]> =>
  userId
    ? db.pendingOperations
        .where("accountId")
        .equals(accountId)
        .filter(
          (row) => row.userId === userId && row.state !== "loaded" && row.state !== "resolved",
        )
        .sortBy("createdAt")
    : Promise.resolve([]);

/**
 * Calls `onChange` with the account's pending operations now and after every change (this tab
 * or another). Returns the unsubscribe function.
 */
export function watchPendingOperations(
  db: Ice24OfflineDatabase,
  accountId: string,
  onChange: (operations: PendingOperation[]) => void,
  onError: (cause: unknown) => void = () => undefined,
  userId?: string,
): () => void {
  const subscription = liveQuery(() => pendingOperationsOf(db, accountId, userId)).subscribe({
    next: onChange,
    error: onError,
  });
  return () => subscription.unsubscribe();
}

import type { ProtectedRecord, OfflineMetadata, LocalKey } from "./protected-store.js";
export * from "./protected-store.js";
export * from "./sync-queue.js";
export * from "./lifecycle.js";
