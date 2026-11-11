"use client";
import { useEffect } from "react";
import { rememberOfflineScope } from "../features/sync/offline-scope";
/** Non-secret identity hint for the same tab. Never stores access, refresh or CSRF tokens. */
export function OfflineScope({
  accountId,
  userId,
  expiresAt,
}: {
  accountId: string | null;
  userId: string | null;
  expiresAt: number;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ICE24_OFFLINE_SHELL !== "1") return;
    try {
      // Missing API facts during a network failure are not logout or revocation.
      // Explicit logout/purge still clears the hint through purgeLocalData.
      if (accountId && userId) rememberOfflineScope({ accountId, userId, expiresAt });
    } catch {
      /* Unavailable storage leaves the offline shell locked. */
    }
  }, [accountId, userId, expiresAt]);
  return null;
}
