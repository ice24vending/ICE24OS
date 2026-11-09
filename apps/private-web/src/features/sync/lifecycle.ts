"use client";
import {
  offlineAccessSchema,
  offlineOrderPackageSchema,
  offlinePurgeReportSchema,
} from "@ice24/contracts";
import {
  invalidateOfflineOrders,
  purgeOfflineOrders,
  readProtectedRecord,
  type OfflineOwner,
} from "@ice24/offline";
import { offlineDb } from "./local-orders";
const receiptKey = "ice24-cleanup-receipts";
export const PURGED_EVENT = "ice24-local-purged";
type Report = ReturnType<typeof offlinePurgeReportSchema.parse>;
type SavedReport = { userId: string; data: Report };
const reports = (): SavedReport[] => {
  try {
    return JSON.parse(localStorage.getItem(receiptKey) ?? "[]") as SavedReport[];
  } catch {
    return [];
  }
};
const saveReports = (rows: SavedReport[]) =>
  localStorage.setItem(receiptKey, JSON.stringify(rows.slice(-100)));
function announce(owner: OfflineOwner, ids: string[], count: number) {
  const detail = { owner, ids, count };
  window.dispatchEvent(new CustomEvent(PURGED_EVENT, { detail }));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(PURGED_EVENT);
    channel.postMessage(detail);
    channel.close();
  }
}
/** Receipts contain opaque operation/lease IDs only. Never retain content, photos, keys or tokens. */
export async function eraseOffline(
  owner: OfflineOwner,
  ids: string[],
  reason: Report["reason"],
  csrfToken?: string,
) {
  if (!ids.length) return 0;
  const leaseIds: string[] = [];
  for (const id of ids) {
    const row = await offlineDb.orders.get(JSON.stringify([owner.accountId, owner.userId, id]));
    if (!row) continue;
    try {
      const blob = await readProtectedRecord(offlineDb, "orders", owner, id, row.downloadedAt);
      if (blob)
        leaseIds.push(offlineOrderPackageSchema.parse(JSON.parse(await blob.text())).lease.id);
    } catch {
      /* Corrupt content is still removed. */
    }
  }
  invalidateOfflineOrders(owner, ids);
  const operationIds = await purgeOfflineOrders(offlineDb, owner, ids);
  const data: Report = { id: crypto.randomUUID(), reason, leaseIds, operationIds };
  if (leaseIds.length) {
    try {
      saveReports([...reports(), { userId: owner.userId, data }]);
    } catch {
      /* Never retain sensitive data because a receipt cannot be stored. */
    }
  }
  announce(owner, ids, operationIds.length);
  if (csrfToken) await flushCleanupReceipts(csrfToken, owner.userId);
  return operationIds.length;
}
export async function flushCleanupReceipts(csrfToken: string, userId?: string) {
  const delivered = new Set<string>();
  for (const item of reports()) {
    if (userId && item.userId !== userId) continue;
    const parsed = offlinePurgeReportSchema.safeParse(item.data);
    if (!parsed.success) continue;
    try {
      const body = new FormData();
      body.set("csrfToken", csrfToken);
      body.set("data", JSON.stringify(parsed.data));
      const response = await fetch("/api/synchronization/lifecycle", {
        method: "POST",
        body,
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) delivered.add(item.data.id);
    } catch {
      // Leave the receipt intact until the server acknowledges it.
    }
  }
  try {
    // Re-read: another purge may have appended a receipt while the request was in flight.
    saveReports(reports().filter((item) => !delivered.has(item.data.id)));
  } catch {
    /* Existing receipts remain available for a retry. */
  }
}
export async function eraseAllOffline(reason: Report["reason"], csrfToken?: string) {
  const rows = await offlineDb.metadata.toArray();
  const scopes = new Map<string, { owner: OfflineOwner; ids: string[] }>();
  for (const row of rows) {
    const key = JSON.stringify([row.accountId, row.userId]);
    const entry = scopes.get(key) ?? {
      owner: { accountId: row.accountId, userId: row.userId },
      ids: [],
    };
    entry.ids.push(row.orderId);
    scopes.set(key, entry);
  }
  let count = 0;
  for (const { owner, ids } of scopes.values())
    count += await eraseOffline(owner, [...new Set(ids)], reason, csrfToken);
  return count;
}
/** A network failure never means revocation. Only explicit authenticated denial or expiry wipes. */
export async function verifyOfflineAccess(currentOwner?: OfflineOwner) {
  const rows = await offlineDb.metadata.toArray();
  if (!rows.length && !reports().length) return;
  let access: ReturnType<typeof offlineAccessSchema.parse> | undefined,
    csrfToken: string | undefined,
    revoked = false;
  if (navigator.onLine) {
    try {
      const response = await fetch("/api/synchronization/lifecycle", {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      const value: unknown = await response.json();
      if (
        value &&
        typeof value === "object" &&
        "csrfToken" in value &&
        typeof value.csrfToken === "string"
      )
        csrfToken = value.csrfToken;
      if (response.ok) access = offlineAccessSchema.parse(value);
      else if (
        [401, 403, 404].includes(response.status) &&
        value &&
        typeof value === "object" &&
        "revoked" in value &&
        value.revoked === true
      )
        revoked = true;
    } catch {
      /* Keep the last valid package while offline, until its expiry. */
    }
  }
  const now = access ? Date.parse(access.serverNow) : Date.now();
  const groups = new Map<
    string,
    { owner: OfflineOwner; ids: string[]; reason: Report["reason"] }
  >();
  for (const row of rows) {
    const owner = { accountId: row.accountId, userId: row.userId };
    const identity = access ?? currentOwner;
    const mismatch =
      identity && (identity.accountId !== owner.accountId || identity.userId !== owner.userId);
    const expired = !access && row.expiresAt <= now;
    const denied = revoked || (access && !access.orderIds.includes(row.orderId));
    if (!mismatch && !expired && !denied) continue;
    const reason: Report["reason"] = mismatch
      ? "identity_changed"
      : expired
        ? "expired"
        : "revoked";
    const key = JSON.stringify([owner.accountId, owner.userId, reason]);
    const group = groups.get(key) ?? { owner, ids: [], reason };
    group.ids.push(row.orderId);
    groups.set(key, group);
  }
  for (const group of groups.values())
    await eraseOffline(group.owner, [...new Set(group.ids)], group.reason, csrfToken);
  if (csrfToken) await flushCleanupReceipts(csrfToken, access?.userId);
}
export function watchOfflineAccess(
  owner: OfflineOwner | undefined,
  onPurged: (count: number) => void,
) {
  let stopped = false,
    running = false;
  const receive = (detail: { owner?: OfflineOwner; count?: number; ids?: string[] }) => {
    if (detail.owner) invalidateOfflineOrders(detail.owner, detail.ids ?? []);
    onPurged(detail.count ?? 0);
  };
  const event = (e: Event) => receive((e as CustomEvent).detail);
  const channel =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(PURGED_EVENT) : undefined;
  if (channel)
    channel.onmessage = (e) => receive(e.data as { owner?: OfflineOwner; count?: number });
  const check = async () => {
    if (stopped || running) return;
    running = true;
    try {
      await verifyOfflineAccess(owner);
    } finally {
      running = false;
    }
  };
  const tick = () => void check().catch(() => undefined);
  window.addEventListener(PURGED_EVENT, event);
  window.addEventListener("online", tick);
  window.addEventListener("pageshow", tick);
  const timer = setInterval(tick, 10_000);
  tick();
  return () => {
    stopped = true;
    clearInterval(timer);
    window.removeEventListener(PURGED_EVENT, event);
    window.removeEventListener("online", tick);
    window.removeEventListener("pageshow", tick);
    channel?.close();
  };
}
