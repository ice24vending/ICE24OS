"use client";
import {
  offlineOrderPackageSchema,
  type OfflineOrderPackage,
  type WorkOrderExecution,
} from "@ice24/contracts";
import {
  Ice24OfflineDatabase,
  allowOfflineOwner,
  allowOfflineOrder,
  readProtectedRecord,
  saveOfflineBundle,
  type OfflineOwner,
  type RecordInput,
} from "@ice24/offline";
export const offlineDb = new Ice24OfflineDatabase();
export async function localRouteCapacity(owner: OfflineOwner) {
  const stores = [offlineDb.orders, offlineDb.drafts, offlineDb.evidence, offlineDb.operations];
  const usage = await offlineDb.transaction("r", stores, async () => {
    let deviceBytes = 0;
    const orderBytes: Record<string, number> = {};
    for (const table of stores)
      for (const row of await table.toArray()) {
        deviceBytes += row.bytes;
        if (row.accountId === owner.accountId && row.userId === owner.userId)
          orderBytes[row.orderId] = (orderBytes[row.orderId] ?? 0) + row.bytes;
      }
    return { deviceBytes, orderBytes };
  });
  const browser = await navigator.storage.estimate();
  return {
    ...usage,
    browserFreeBytes:
      browser.quota === undefined ? undefined : Math.max(0, browser.quota - (browser.usage ?? 0)),
  };
}
export const localMetadata = (packet: OfflineOrderPackage, id = packet.order.id): RecordInput => ({
  accountId: packet.accountId,
  userId: packet.userId,
  id,
  orderId: packet.order.id,
  packageVersion: packet.order.rowVersion,
  downloadedAt: packet.localTime?.downloadedAt ?? Date.parse(packet.lease.downloadedAt),
  expiresAt: packet.localTime?.expiresAt ?? Date.parse(packet.lease.expiresAt),
});
export const jsonBlob = (value: unknown) =>
  new Blob([JSON.stringify(value)], { type: "application/json" });
export async function readLocalOrder(owner: OfflineOwner, id: string) {
  const blob = await readProtectedRecord(offlineDb, "orders", owner, id);
  return blob ? offlineOrderPackageSchema.parse(JSON.parse(await blob.text())) : undefined;
}
export async function storeLocalOrder(packet: OfflineOrderPackage) {
  allowOfflineOwner(packet);
  allowOfflineOrder(packet, packet.order.id);
  const now = Date.now();
  packet.localTime = {
    downloadedAt: now,
    expiresAt: now + Date.parse(packet.lease.expiresAt) - Date.parse(packet.lease.downloadedAt),
  };
  await saveOfflineBundle(offlineDb, [
    { store: "orders", input: localMetadata(packet), payload: jsonBlob(packet) },
  ]);
}
export async function saveLocalDraft(packet: OfflineOrderPackage, execution: WorkOrderExecution) {
  await saveOfflineBundle(offlineDb, [
    { store: "drafts", input: localMetadata(packet), payload: jsonBlob(execution) },
  ]);
}
export async function queueLocalClosure(
  packet: OfflineOrderPackage,
  execution: WorkOrderExecution,
) {
  const id = crypto.randomUUID();
  const photos = execution.evidence.flatMap((e) =>
    e.type === "photo" && e.fileVersionId === e.fileId ? [e.fileId] : [],
  );
  const operation = {
    id,
    orderId: packet.order.id,
    leaseId: packet.lease.id,
    deviceId: packet.lease.deviceId,
    expectedVersion: packet.order.rowVersion,
    action: "close",
    execution,
  };
  await saveOfflineBundle(
    offlineDb,
    [
      { store: "drafts", input: localMetadata(packet), payload: jsonBlob(execution) },
      { store: "operations", input: localMetadata(packet, id), payload: jsonBlob(operation) },
    ],
    {
      id,
      accountId: packet.accountId,
      userId: packet.userId,
      action: "work-order-close",
      state: "pending",
      createdAt: new Date().toISOString(),
      expectedVersion: packet.order.rowVersion,
      dependencies: photos,
      href: `/offline-work.html?order=${packet.order.id}`,
    },
  );
  return id;
}
