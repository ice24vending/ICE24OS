"use client";
import { useEffect } from "react";
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
      if (accountId && userId)
        sessionStorage.setItem(
          "ice24-offline-scope",
          JSON.stringify({ accountId, userId, expiresAt }),
        );
      else sessionStorage.removeItem("ice24-offline-scope");
    } catch {
      /* Unavailable storage leaves the offline shell locked. */
    }
  }, [accountId, userId, expiresAt]);
  return null;
}
