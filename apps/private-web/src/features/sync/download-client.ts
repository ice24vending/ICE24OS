"use client";
import { offlineDownloadSchema, offlineOrderPackageSchema, type WorkOrder } from "@ice24/contracts";
import { requestPersistentStorage } from "@ice24/offline";
import { rememberOfflineScope, OFFLINE_EXPIRY_KEY } from "./offline-scope";
import { storeLocalOrder } from "./local-orders";

export function offlineDeviceId(): string {
  const stored = offlineDownloadSchema.safeParse({
    deviceId: localStorage.getItem("ice24-offline-device"),
  });
  if (stored.success) return stored.data.deviceId;
  const id = crypto.randomUUID();
  localStorage.setItem("ice24-offline-device", id);
  return id;
}

/** Shared by individual and route downloads: the server still reserves each order separately. */
export async function downloadOrder(
  order: WorkOrder,
  options: {
    userId: string;
    contextId: string;
    csrfToken: string;
    signal?: AbortSignal;
  },
) {
  const estimated = new Blob([JSON.stringify(order)]).size;
  const storage = await navigator.storage.estimate();
  if (storage.quota !== undefined && storage.quota - (storage.usage ?? 0) < estimated * 3)
    throw new Error("No hay espacio suficiente. Libera almacenamiento antes de descargar.");
  await requestPersistentStorage(navigator.storage);
  const attemptKey = `ice24-download:${options.userId}:${order.id}`;
  let attempt: { key: string; deviceId: string; version: number } | null = null;
  const saved: unknown = JSON.parse(localStorage.getItem(attemptKey) ?? "null");
  if (
    saved &&
    typeof saved === "object" &&
    "key" in saved &&
    typeof saved.key === "string" &&
    "deviceId" in saved &&
    typeof saved.deviceId === "string" &&
    "version" in saved &&
    typeof saved.version === "number"
  )
    attempt = { key: saved.key, deviceId: saved.deviceId, version: saved.version };
  const deviceId = offlineDeviceId();
  attempt ??= { key: crypto.randomUUID(), deviceId, version: order.rowVersion };
  localStorage.setItem(attemptKey, JSON.stringify(attempt));
  const form = new FormData();
  form.set("data", JSON.stringify({ deviceId: attempt.deviceId }));
  form.set("key", attempt.key);
  form.set("version", String(attempt.version));
  form.set("csrfToken", options.csrfToken);
  const response = await fetch(`/api/synchronization/orders/${order.id}/download`, {
    method: "POST",
    headers: { "x-ice24-workspace-context": options.contextId },
    body: form,
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(30_000)])
      : AbortSignal.timeout(30_000),
  });
  if (response.status === 409) localStorage.removeItem(attemptKey);
  if (!response.ok)
    throw new Error((await response.json()).message ?? "No fue posible descargar la orden.");
  const packet = offlineOrderPackageSchema.parse(await response.json());
  options.signal?.throwIfAborted();
  await storeLocalOrder(packet);
  sessionStorage.removeItem(OFFLINE_EXPIRY_KEY);
  rememberOfflineScope({
    accountId: packet.accountId,
    userId: packet.userId,
    expiresAt: packet.localTime?.expiresAt ?? Date.parse(packet.lease.expiresAt),
  });
  await navigator.serviceWorker.register("/sw.js?offline=1");
  await navigator.serviceWorker.ready;
  return packet;
}
