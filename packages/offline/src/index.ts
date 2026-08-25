import Dexie, { type EntityTable } from "dexie";

export const OFFLINE_DATABASE_NAME = "ice24-private";
export const OFFLINE_SCHEMA_VERSION = 1;

export interface PendingOperation {
  readonly id: string;
  readonly accountId: string;
  readonly action: string;
  readonly createdAt: string;
  readonly expectedVersion?: number;
  readonly state: "pending" | "synchronizing" | "failed" | "conflict";
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
