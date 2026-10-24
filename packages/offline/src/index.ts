import Dexie, { liveQuery, type EntityTable } from "dexie";

export const OFFLINE_DATABASE_NAME = "ice24-private";
export const OFFLINE_SCHEMA_VERSION = 1;

export interface PendingOperation {
  /** Also the idempotency key: every send of this operation reuses it, so a retry never duplicates. */
  readonly id: string;
  readonly accountId: string;
  readonly action: string;
  readonly createdAt: string;
  readonly expectedVersion?: number;
  readonly state: "pending" | "synchronizing" | "failed" | "conflict";
  /** Page where the person reviews and sends it («Ver pendientes»). Not indexed. */
  readonly href?: string;
  /** Number of send attempts (UI_UX §20.5). Not indexed. */
  readonly attempts?: number;
}

export class Ice24OfflineDatabase extends Dexie {
  public readonly pendingOperations!: EntityTable<PendingOperation, "id">;

  public constructor() {
    super(OFFLINE_DATABASE_NAME);
    this.version(OFFLINE_SCHEMA_VERSION).stores({
      pendingOperations: "&id, accountId, state, createdAt",
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
  await db.pendingOperations.put(operation);
};

/** Pending operations of one account, oldest first. */
export const pendingOperationsOf = (db: Ice24OfflineDatabase, accountId: string) =>
  db.pendingOperations.where("accountId").equals(accountId).sortBy("createdAt");

/**
 * Calls `onChange` with the account's pending operations now and after every change (this tab
 * or another). Returns the unsubscribe function.
 */
export function watchPendingOperations(
  db: Ice24OfflineDatabase,
  accountId: string,
  onChange: (operations: PendingOperation[]) => void,
  onError: (cause: unknown) => void = () => undefined,
): () => void {
  const subscription = liveQuery(() => pendingOperationsOf(db, accountId)).subscribe({
    next: onChange,
    error: onError,
  });
  return () => subscription.unsubscribe();
}
