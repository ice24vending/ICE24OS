import { offlineSessionSchema } from "@ice24/contracts";
/** Same-tab identity hint, never a credential or permission to extend a lease. */
export function readOfflineScope(now = Date.now()) {
  let value: unknown;
  try {
    value = JSON.parse(sessionStorage.getItem("ice24-offline-scope") ?? "null");
  } catch {
    value = null;
  }
  const owner = offlineSessionSchema.pick({ accountId: true, userId: true }).safeParse(value);
  if (
    !owner.success ||
    !value ||
    typeof value !== "object" ||
    !("expiresAt" in value) ||
    typeof value.expiresAt !== "number" ||
    !Number.isFinite(value.expiresAt) ||
    value.expiresAt <= now
  )
    throw new Error("Reconecta e inicia sesión para verificar el acceso a tus descargas.");
  return owner.data;
}

export const OFFLINE_TAB_NOTICE =
  "Si cierras el navegador, necesitarás conexión para volver a abrir tus descargas.";

/** Only authenticated shell/download callers write this identity hint. Each packet still validates its own lease. */
export function rememberOfflineScope(next: {
  accountId: string;
  userId: string;
  expiresAt: number;
}) {
  let expiresAt = next.expiresAt;
  try {
    const previous = JSON.parse(sessionStorage.getItem("ice24-offline-scope") ?? "null");
    if (
      previous?.accountId === next.accountId &&
      previous?.userId === next.userId &&
      Number.isFinite(previous.expiresAt)
    )
      expiresAt = Math.max(expiresAt, previous.expiresAt);
  } catch {
    /* Replace malformed hints, never adopt another identity. */
  }
  sessionStorage.setItem("ice24-offline-scope", JSON.stringify({ ...next, expiresAt }));
}

/** Same-tab presentation receipt only. Never used to authorize or extend a download. */
export const OFFLINE_EXPIRY_KEY = "ice24-offline-expiry";
export function rememberOfflineExpiry(owner: { accountId: string; userId: string }, count: number) {
  try {
    sessionStorage.setItem(OFFLINE_EXPIRY_KEY, JSON.stringify({ ...owner, count, at: Date.now() }));
  } catch {
    /* Purging must never depend on presentation storage. */
  }
}
export function readOfflineExpiry(owner: {
  accountId: string;
  userId: string;
}): number | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(OFFLINE_EXPIRY_KEY) ?? "null");
    if (
      value?.accountId === owner.accountId &&
      value?.userId === owner.userId &&
      Number.isSafeInteger(value.count) &&
      value.count >= 0
    )
      return value.count;
  } catch {
    /* No presentation receipt. */
  }
  return undefined;
}
