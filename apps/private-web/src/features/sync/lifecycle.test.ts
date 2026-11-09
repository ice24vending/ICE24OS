// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { webcrypto } from "node:crypto";
import { Blob as NodeBlob } from "node:buffer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { allowOfflineOrder, allowOfflineOwner, saveOfflineBundle } from "@ice24/offline";
import { offlineDb } from "./local-orders";
import { verifyOfflineAccess, eraseAllOffline, flushCleanupReceipts } from "./lifecycle";
const accountId = "11111111-1111-4111-8111-111111111111",
  userId = "22222222-2222-4222-8222-222222222222",
  id = "33333333-3333-4333-8333-333333333333";
const owner = { accountId, userId };
beforeEach(async () => {
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("Blob", NodeBlob);
  localStorage.clear();
  await offlineDb.open();
  allowOfflineOwner(owner);
  allowOfflineOrder(owner, id);
  const input = {
    ...owner,
    id,
    orderId: id,
    packageVersion: 1,
    downloadedAt: Date.now() - 1000,
    expiresAt: Date.now() + 3600_000,
  };
  await saveOfflineBundle(offlineDb, [
    { store: "orders", input, payload: new Blob(["corrupt package must still be purged"]) },
    { store: "drafts", input, payload: new Blob(["confidential draft"]) },
    { store: "evidence", input, payload: new Blob(["confidential photo"]) },
  ]);
});
afterEach(async () => {
  await offlineDb.delete();
  vi.unstubAllGlobals();
});
it.each(["logout", "revoked", "identity_changed", "expired"] as const)(
  "purges all stores and the final key for %s",
  async (reason) => {
    await eraseAllOffline(reason);
    expect(await offlineDb.orders.count()).toBe(0);
    expect(await offlineDb.drafts.count()).toBe(0);
    expect(await offlineDb.evidence.count()).toBe(0);
    expect(await offlineDb.keys.count()).toBe(0);
  },
);
it.each([401, 403, 404])("purges only on explicit revocation (%s)", async (status) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ status, ok: false, json: async () => ({ revoked: true }) }),
  );
  await verifyOfflineAccess(owner);
  expect(await offlineDb.keys.count()).toBe(0);
});
it.each([403, 500, 503])("preserves data on an unverified failure (%s)", async (status) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status,
      ok: false,
      json: async () => ({ message: "Network or upstream error" }),
    }),
  );
  await verifyOfflineAccess(owner);
  expect(await offlineDb.orders.count()).toBe(1);
});
it("purges a download excluded from the current authorized scope", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ ...owner, serverNow: new Date().toISOString(), orderIds: [] }),
    }),
  );
  await verifyOfflineAccess(owner);
  expect(await offlineDb.keys.count()).toBe(0);
});
it("preserves an authorized package despite a different server clock", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        ...owner,
        serverNow: new Date(Date.now() + 5 * 86400_000).toISOString(),
        orderIds: [id],
      }),
    }),
  );
  await verifyOfflineAccess(owner);
  expect(await offlineDb.orders.count()).toBe(1);
});
it("does not lose a newly queued audit receipt while acknowledging an earlier one", async () => {
  const first = {
    userId,
    data: { id: crypto.randomUUID(), reason: "revoked", leaseIds: [], operationIds: [] },
  };
  const second = { userId, data: { ...first.data, id: crypto.randomUUID() } };
  localStorage.setItem("ice24-cleanup-receipts", JSON.stringify([first]));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      localStorage.setItem("ice24-cleanup-receipts", JSON.stringify([first, second]));
      return { ok: true };
    }),
  );
  await flushCleanupReceipts("test-csrf", userId);
  expect(JSON.parse(localStorage.getItem("ice24-cleanup-receipts")!)).toEqual([second]);
});
