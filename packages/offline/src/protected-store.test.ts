import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Ice24OfflineDatabase,
  pendingOperationsOf,
  saveProtectedRecord,
  readProtectedRecord,
  purgeProtectedDatabase,
  requestPersistentStorage,
} from "./index.js";
const databases: Ice24OfflineDatabase[] = [];
const now = Date.now();
const owner = { accountId: "account-a", userId: "user-a" };
const input = {
  ...owner,
  id: "draft-1",
  orderId: "order-1",
  packageVersion: 1,
  downloadedAt: now,
  expiresAt: now + 60_000,
};
const database = () => {
  const db = new Ice24OfflineDatabase(`test-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
};
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
  vi.restoreAllMocks();
});
describe("protected offline v2", () => {
  it("preserves v1 pending operations without assigning them to a different user", async () => {
    const db = database();
    const old = new Dexie(db.name);
    old.version(1).stores({ pendingOperations: "&id, accountId, state, createdAt" });
    await old.table("pendingOperations").put({
      id: "legacy",
      accountId: owner.accountId,
      state: "pending",
      createdAt: new Date(now).toISOString(),
    });
    old.close();
    await db.open();
    expect(await db.pendingOperations.count()).toBe(1);
    expect(await pendingOperationsOf(db, owner.accountId, owner.userId)).toEqual([]);
    expect(await pendingOperationsOf(db, owner.accountId)).toEqual([]);
  });
  it("encrypts drafts and blobs, survives reopening, and separates accounts and users", async () => {
    const db = database();
    await saveProtectedRecord(db, "drafts", input, new Blob(["private diagnosis"]), now);
    await saveProtectedRecord(
      db,
      "evidence",
      { ...input, id: "photo" },
      new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
      now,
    );
    const row = (await db.drafts.toArray())[0]!;
    expect(new TextDecoder().decode(row.ciphertext)).not.toContain("private diagnosis");
    expect((await db.keys.toArray())[0]!.value.extractable).toBe(false);
    db.close();
    await db.open();
    expect(await (await readProtectedRecord(db, "drafts", owner, input.id, now))!.text()).toBe(
      "private diagnosis",
    );
    expect(
      await readProtectedRecord(db, "drafts", { ...owner, userId: "other" }, input.id, now),
    ).toBeUndefined();
    expect(
      await readProtectedRecord(db, "drafts", { ...owner, accountId: "other" }, input.id, now),
    ).toBeUndefined();
    expect(
      new Uint8Array(
        await (await readProtectedRecord(db, "evidence", owner, "photo", now))!.arrayBuffer(),
      ),
    ).toEqual(new Uint8Array([1, 2, 3]));
  });
  it("refuses expired data and detects modified ciphertext", async () => {
    const db = database();
    await saveProtectedRecord(db, "drafts", input, new Blob(["original"]), now);
    await expect(
      readProtectedRecord(db, "drafts", owner, input.id, input.expiresAt),
    ).rejects.toMatchObject({ code: "expired" });
    const row = (await db.drafts.toArray())[0]!;
    await db.drafts.update(row.key, { ciphertext: new ArrayBuffer(20) });
    await expect(readProtectedRecord(db, "drafts", owner, input.id, now)).rejects.toMatchObject({
      code: "corrupt",
    });
    expect(await db.drafts.count()).toBe(1);
  });
  it("rolls back a quota failure without destroying the previous draft", async () => {
    const db = database();
    await saveProtectedRecord(db, "drafts", input, new Blob(["original"]), now);
    vi.spyOn(db.metadata, "put").mockRejectedValueOnce(
      new DOMException("full", "QuotaExceededError"),
    );
    await expect(
      saveProtectedRecord(db, "drafts", input, new Blob(["replacement"]), now),
    ).rejects.toMatchObject({ code: "storage_full" });
    expect(await (await readProtectedRecord(db, "drafts", owner, input.id, now))!.text()).toBe(
      "original",
    );
  });
  it("reports blocked storage and does not claim successful persistence", async () => {
    const db = database();
    vi.spyOn(db.keys, "get").mockRejectedValueOnce(new DOMException("blocked", "SecurityError"));
    await expect(
      saveProtectedRecord(db, "orders", input, new Blob(["order"]), now),
    ).rejects.toMatchObject({ code: "storage_unavailable" });
    expect(
      await requestPersistentStorage({
        persist: async () => {
          throw new Error("blocked");
        },
      }),
    ).toBe(false);
  });
  it("purges all accounts, blobs, metadata and keys together", async () => {
    const db = database();
    await saveProtectedRecord(db, "drafts", input, new Blob(["draft"]), now);
    await saveProtectedRecord(
      db,
      "operations",
      { ...input, userId: "other" },
      new Blob(["operation"]),
      now,
    );
    await purgeProtectedDatabase(db);
    expect(await Promise.all(db.tables.map((t) => t.count()))).toEqual(db.tables.map(() => 0));
  });
});
