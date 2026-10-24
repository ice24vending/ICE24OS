"use client";
import { useEffect, useState } from "react";
import {
  clearProtectedLocalData,
  Ice24OfflineDatabase,
  queueOperation,
  watchPendingOperations,
  type PendingOperation,
} from "@ice24/offline";

/**
 * Local queue of the private web (F6-10, UI_UX §20.5–20.7) on @ice24/offline. IndexedDB may be
 * missing (private windows, blocked storage): every call degrades to "nothing stored".
 */
let database: Ice24OfflineDatabase | undefined;
const db = () => (database ??= new Ice24OfflineDatabase());
const available = () => typeof indexedDB !== "undefined";

export type { PendingOperation };

/** Pending operations of the account, live (this tab and others). */
export function usePendingOperations(accountId: string | null): readonly PendingOperation[] {
  const [operations, setOperations] = useState<readonly PendingOperation[]>([]);
  useEffect(() => {
    if (!accountId || !available()) return;
    return watchPendingOperations(db(), accountId, setOperations, () => setOperations([]));
  }, [accountId]);
  return operations;
}

export const saveLocally = (operation: PendingOperation) =>
  available() ? queueOperation(db(), operation) : Promise.reject(new Error("Sin almacenamiento"));

export const removeLocal = async (id: string) => {
  if (available()) await db().pendingOperations.delete(id);
};

/**
 * Deletes every protected local record of this device, all accounts included: sign-out, expired
 * session, revoked access (UI_UX §20.7). Never throws, so it cannot block leaving.
 */
export async function purgeLocalData(): Promise<void> {
  if (!available()) return;
  try {
    await clearProtectedLocalData(db().pendingOperations);
  } catch {
    // Storage blocked or already gone: there is nothing left to protect.
  }
}
