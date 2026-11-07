"use client";
import {
  offlineOrderPackageSchema,
  type OfflineOrderPackage,
  type WorkOrderExecution,
} from "@ice24/contracts";
import {
  Ice24OfflineDatabase,
  readProtectedRecord,
  saveOfflineBundle,
  type OfflineOwner,
  type RecordInput,
} from "@ice24/offline";
export const offlineDb = new Ice24OfflineDatabase();
export const localMetadata = (packet: OfflineOrderPackage, id = packet.order.id): RecordInput => ({
  accountId: packet.accountId,
  userId: packet.userId,
  id,
  orderId: packet.order.id,
  packageVersion: packet.order.rowVersion,
  downloadedAt: Date.parse(packet.lease.downloadedAt),
  expiresAt: Date.parse(packet.lease.expiresAt),
});
export const jsonBlob = (value: unknown) =>
  new Blob([JSON.stringify(value)], { type: "application/json" });
export async function readLocalOrder(owner: OfflineOwner, id: string) {
  const blob = await readProtectedRecord(offlineDb, "orders", owner, id);
  return blob ? offlineOrderPackageSchema.parse(JSON.parse(await blob.text())) : undefined;
}
export async function storeLocalOrder(packet: OfflineOrderPackage) {
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
