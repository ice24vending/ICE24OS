import type { Ice24OfflineDatabase } from "./index.js";

export type OfflineStore = "orders" | "drafts" | "evidence" | "operations";
export interface OfflineOwner {
  accountId: string;
  userId: string;
}
export interface OfflineMetadata extends OfflineOwner {
  key: string;
  scope: string;
  orderId: string;
  packageVersion: number;
  downloadedAt: number;
  expiresAt: number;
}
export interface ProtectedRecord extends OfflineMetadata {
  bytes: number;
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: ArrayBuffer;
  mimeType: string;
}
export interface LocalKey extends OfflineOwner {
  key: string;
  value: CryptoKey;
  generation: string;
}
export type OfflineFailure = "storage_full" | "storage_unavailable" | "expired" | "corrupt";
export class OfflineStorageError extends Error {
  constructor(public readonly code: OfflineFailure) {
    super(code);
    this.name = "OfflineStorageError";
  }
}
export const OFFLINE_LIMITS = {
  orderBytes: 50 * 1024 * 1024,
  deviceBytes: 250 * 1024 * 1024,
  lifetimeMs: 72 * 60 * 60 * 1000,
} as const;
const stores: OfflineStore[] = ["orders", "drafts", "evidence", "operations"];
const scopeOf = (owner: OfflineOwner) => {
  if (!owner.accountId || !owner.userId) throw new OfflineStorageError("storage_unavailable");
  return JSON.stringify([owner.accountId, owner.userId]);
};
const keyOf = (owner: OfflineOwner, id: string) =>
  JSON.stringify([owner.accountId, owner.userId, id]);
const aad = (store: OfflineStore, record: OfflineMetadata) =>
  new TextEncoder().encode(
    JSON.stringify([
      store,
      record.key,
      record.scope,
      record.orderId,
      record.packageVersion,
      record.downloadedAt,
      record.expiresAt,
    ]),
  );
function normalize(error: unknown): never {
  if (error instanceof OfflineStorageError) throw error;
  if (
    error instanceof Error &&
    (error.name === "QuotaExceededError" || error.message.includes("QuotaExceededError"))
  )
    throw new OfflineStorageError("storage_full");
  throw new OfflineStorageError("storage_unavailable");
}
/** Caller must supply owner and package metadata from an authorized server response, never a form. */
export async function saveProtectedRecord(
  db: Ice24OfflineDatabase,
  store: OfflineStore,
  input: Omit<OfflineMetadata, "key" | "scope"> & { id: string },
  payload: Blob,
  now = Date.now(),
): Promise<void> {
  try {
    if (
      !globalThis.crypto?.subtle ||
      !Number.isSafeInteger(input.packageVersion) ||
      input.packageVersion < 1
    )
      throw new OfflineStorageError("storage_unavailable");
    if (
      !Number.isFinite(input.downloadedAt) ||
      !Number.isFinite(input.expiresAt) ||
      input.downloadedAt > now ||
      input.expiresAt <= now ||
      input.expiresAt - input.downloadedAt > OFFLINE_LIMITS.lifetimeMs
    )
      throw new OfflineStorageError("expired");
    if (payload.size > OFFLINE_LIMITS.orderBytes) throw new OfflineStorageError("storage_full");
    const scope = scopeOf(input),
      key = keyOf(input, input.id);
    let localKey = await db.keys.get(scope);
    if (!localKey) {
      const candidate = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
        "encrypt",
        "decrypt",
      ]);
      localKey = await db.transaction("rw", db.keys, async () => {
        const existing = await db.keys.get(scope);
        if (existing) return existing;
        const row = {
          key: scope,
          value: candidate,
          generation: crypto.randomUUID(),
          accountId: input.accountId,
          userId: input.userId,
        };
        await db.keys.add(row);
        return row;
      });
    }
    const metadata: OfflineMetadata = {
      key,
      scope,
      accountId: input.accountId,
      userId: input.userId,
      orderId: input.orderId,
      packageVersion: input.packageVersion,
      downloadedAt: input.downloadedAt,
      expiresAt: input.expiresAt,
    };
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: aad(store, metadata) },
      localKey.value,
      await payload.arrayBuffer(),
    );
    const record: ProtectedRecord = {
      ...metadata,
      bytes: ciphertext.byteLength,
      iv,
      ciphertext,
      mimeType: payload.type,
    };
    await db.transaction(
      "rw",
      [...stores.map((name) => db[name]), db.metadata, db.keys],
      async () => {
        if ((await db.keys.get(scope))?.generation !== localKey.generation)
          throw new OfflineStorageError("storage_unavailable");
        let deviceBytes = 0,
          orderBytes = 0;
        for (const name of stores) {
          for (const row of await db[name].toArray()) {
            if (name === store && row.key === key) continue;
            deviceBytes += row.bytes;
            if (row.scope === scope && row.orderId === input.orderId) orderBytes += row.bytes;
          }
        }
        if (
          deviceBytes + record.bytes > OFFLINE_LIMITS.deviceBytes ||
          orderBytes + record.bytes > OFFLINE_LIMITS.orderBytes
        )
          throw new OfflineStorageError("storage_full");
        await db[store].put(record);
        await db.metadata.put({ ...metadata, key: keyOf(input, input.orderId) });
      },
    );
  } catch (error) {
    normalize(error);
  }
}

export async function readProtectedRecord(
  db: Ice24OfflineDatabase,
  store: OfflineStore,
  owner: OfflineOwner,
  id: string,
  now = Date.now(),
): Promise<Blob | undefined> {
  try {
    const row = await db[store].get(keyOf(owner, id));
    if (!row) return undefined;
    if (
      row.scope !== scopeOf(owner) ||
      row.accountId !== owner.accountId ||
      row.userId !== owner.userId
    )
      throw new OfflineStorageError("corrupt");
    if (!Number.isFinite(row.expiresAt) || row.expiresAt <= now)
      throw new OfflineStorageError("expired");
    const localKey = await db.keys.get(row.scope);
    if (!localKey) throw new OfflineStorageError("storage_unavailable");
    try {
      const bytes = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: row.iv, additionalData: aad(store, row) },
        localKey.value,
        row.ciphertext,
      );
      return new Blob([bytes], { type: row.mimeType });
    } catch {
      throw new OfflineStorageError("corrupt");
    }
  } catch (error) {
    normalize(error);
  }
}

/** All stores and cryptographic keys are erased atomically; failures propagate to the caller. */
export async function purgeProtectedDatabase(db: Ice24OfflineDatabase): Promise<void> {
  try {
    await db.transaction("rw", db.tables, async () => {
      for (const table of db.tables) await table.clear();
    });
  } catch (error) {
    normalize(error);
  }
}

export async function requestPersistentStorage(
  storage?: Pick<StorageManager, "persist">,
): Promise<boolean> {
  try {
    return (await storage?.persist()) ?? false;
  } catch {
    return false;
  }
}
