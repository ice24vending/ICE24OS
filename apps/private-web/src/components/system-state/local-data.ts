"use client";
import { eraseAllOffline } from "../../features/sync/lifecycle";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  purgeProtectedDatabase,
  Ice24OfflineDatabase,
  queueOperation,
  watchPendingOperations,
  type PendingOperation,
} from "@ice24/offline";
import { useAccountAccess } from "../../features/account-shell/access-provider";

/**
 * Local queue of the private web (F6-10, UI_UX §20.5–20.7) on @ice24/offline. IndexedDB may be
 * missing (private windows, blocked storage): every call degrades to "nothing stored".
 */
let database: Ice24OfflineDatabase | undefined;
const db = () => (database ??= new Ice24OfflineDatabase());
const available = () => typeof indexedDB !== "undefined";
let storageProblem: "storage_full" | "storage_unavailable" | null = null;
const listeners = new Set<() => void>();
const report = (error: unknown) => {
  storageProblem =
    error instanceof Error &&
    (error.name === "QuotaExceededError" || ("code" in error && error.code === "storage_full"))
      ? "storage_full"
      : "storage_unavailable";
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const useLocalStorageProblem = () =>
  useSyncExternalStore(
    subscribe,
    () => storageProblem,
    () => null,
  );

export type { PendingOperation };

/** Pending operations of the account, live (this tab and others). */
export function usePendingOperations(accountId: string | null): readonly PendingOperation[] {
  const { userId } = useAccountAccess();
  const [operations, setOperations] = useState<readonly PendingOperation[]>([]);
  useEffect(() => {
    if (!accountId || !userId) return;
    if (!available()) {
      report(new Error("Sin almacenamiento"));
      return;
    }
    return watchPendingOperations(db(), accountId, setOperations, report, userId);
  }, [accountId, userId]);
  return operations.filter(
    (operation) => operation.accountId === accountId && operation.userId === userId,
  );
}

export const saveLocally = async (operation: PendingOperation) => {
  try {
    if (!available() || !operation.userId)
      throw new Error("Sin almacenamiento o usuario verificado");
    await queueOperation(db(), operation);
    storageProblem = null;
    listeners.forEach((listener) => listener());
  } catch (error) {
    report(error);
    throw error;
  }
};

export const removeLocal = async (id: string) => {
  if (available()) await db().pendingOperations.delete(id);
};

/**
 * Deletes every protected local record of this device, all accounts included: sign-out, expired
 * session, revoked access (UI_UX §20.7). Never throws, so it cannot block leaving.
 */
export async function purgeLocalData(csrfToken?: string): Promise<void> {
  try {
    sessionStorage.removeItem("ice24-offline-scope");
  } catch (error) {
    report(error);
  }
  if (!available()) return;
  try {
    await eraseAllOffline("logout", csrfToken);
    await purgeProtectedDatabase(db());
  } catch (error) {
    report(error);
  }
}
