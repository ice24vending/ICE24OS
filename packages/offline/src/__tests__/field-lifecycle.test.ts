import "fake-indexeddb/auto";
import { afterEach, expect, it } from "vitest";
import {
  Ice24OfflineDatabase,
  saveOfflineBundle,
  purgeOfflineOrders,
  readProtectedRecord,
  prepareProtectedRecord,
  commitProtectedRecords,
  invalidateOfflineOwner,
  allowOfflineOwner,
  discardQueuedOperation,
} from "../index.js";
const databases: Ice24OfflineDatabase[] = [];
const create = () => {
  const db = new Ice24OfflineDatabase(crypto.randomUUID());
  databases.push(db);
  return db;
};
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});
const owner = { accountId: "a", userId: "u" };
async function seed(db: Ice24OfflineDatabase, id: string, accountId = "a") {
  allowOfflineOwner({ ...owner, accountId });
  const input = {
    ...owner,
    accountId,
    id,
    orderId: id,
    packageVersion: 1,
    downloadedAt: Date.now() - 1000,
    expiresAt: Date.now() + 3600_000,
  };
  await saveOfflineBundle(
    db,
    [
      { store: "orders", input, payload: new Blob(["order"]) },
      { store: "evidence", input, payload: new Blob(["photo"]) },
      { store: "operations", input, payload: new Blob(['{"value":"draft"}']) },
    ],
    {
      ...owner,
      accountId,
      id,
      action: "work-order-close",
      state: "pending",
      href: `/offline-work.html?order=${id}`,
      createdAt: new Date().toISOString(),
    },
  );
  return input;
}
it("removes package, evidence, queue and last key without touching another account", async () => {
  const db = create();
  await seed(db, "one");
  await seed(db, "two", "b");
  expect(await purgeOfflineOrders(db, owner, ["one"])).toEqual(["one"]);
  for (const table of [db.orders, db.evidence, db.operations, db.metadata])
    expect(
      await table
        .where("scope")
        .equals(JSON.stringify(["a", "u"]))
        .count(),
    ).toBe(0);
  expect(await db.keys.get(JSON.stringify(["a", "u"]))).toBeUndefined();
  expect(await db.pendingOperations.get("one")).toBeUndefined();
  expect(await db.pendingOperations.get("two")).toBeDefined();
});
it("rejects an in-flight encrypted write and a late queued write after revocation", async () => {
  const db = create(),
    input = await seed(db, "one");
  const prepared = await prepareProtectedRecord(db, "drafts", input, new Blob(["late"]));
  invalidateOfflineOwner(owner);
  await purgeOfflineOrders(db, owner, ["one"]);
  await expect(commitProtectedRecords(db, [prepared])).rejects.toThrow();
  await expect(
    saveOfflineBundle(db, [{ store: "drafts", input, payload: new Blob(["late"]) }]),
  ).rejects.toThrow();
  expect(await db.drafts.count()).toBe(0);
  allowOfflineOwner(owner);
});
it("keeps completed files needed by another pending operation and requires explicit discard order", async () => {
  const db = create();
  const input = await seed(db, "photo");
  await saveOfflineBundle(
    db,
    [{ store: "operations", input: { ...input, id: "close" }, payload: new Blob(["{}"]) }],
    {
      ...owner,
      id: "close",
      action: "work-order-close",
      createdAt: new Date().toISOString(),
      state: "pending",
      dependencies: ["photo"],
    },
  );
  await expect(discardQueuedOperation(db, owner, "photo")).rejects.toThrow("depende");
  await discardQueuedOperation(db, owner, "close");
  await discardQueuedOperation(db, owner, "photo");
  expect((await db.pendingOperations.get("close"))?.state).toBe("resolved");
  expect(await readProtectedRecord(db, "operations", owner, "close")).toBeUndefined();
});
it("rolls back all encrypted rows when a simulated transaction crashes", async () => {
  const db = create();
  await seed(db, "one");
  await expect(
    db.transaction("rw", db.tables, async () => {
      await db.orders.clear();
      await db.evidence.clear();
      throw Error("tab crash");
    }),
  ).rejects.toThrow("tab crash");
  expect(await db.orders.count()).toBe(1);
  expect(await db.evidence.count()).toBe(1);
});
