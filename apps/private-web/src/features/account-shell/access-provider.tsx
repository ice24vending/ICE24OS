"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { readOnlyNotice, writeBlockedText, type AccessMode, type ReadOnlyNotice } from "./access";

interface AccountAccess {
  /** Effective mode of the active account; null when the context could not be read. */
  readonly mode: AccessMode | null;
  readonly notice: ReadOnlyNotice;
  /** False in read-only or suspended accounts. The API enforces it regardless (F5-03). */
  readonly canWrite: boolean;
  /** Text to show next to a write control that is disabled by the access mode. */
  readonly blockedText: string;
  readonly billingOwner: boolean;
  readonly online: boolean;
  /** Call when an API answer reports ACCOUNT_READ_ONLY after the page loaded. */
  readonly markReadOnly: () => void;
  /** Lets a screen that reads its own access (equipment) keep the shell in sync. */
  readonly syncMode: (mode: string) => void;
}

const AccessContext = createContext<AccountAccess | null>(null);

const subscribe = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

/** `navigator.onLine`, assumed online during server rendering. */
export const useOnline = () =>
  useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

export function AccessProvider({
  initialMode,
  initialNotice,
  billingOwner,
  children,
}: {
  initialMode: AccessMode | null;
  initialNotice: ReadOnlyNotice;
  billingOwner: boolean;
  children: ReactNode;
}) {
  const [mode, setMode] = useState(initialMode);
  const online = useOnline();
  const markReadOnly = useCallback(
    () => setMode((current) => (current === "SUSPENDED" ? current : "READ_ONLY")),
    [],
  );
  const syncMode = useCallback((next: string) => {
    if (next === "ACTIVE" || next === "READ_ONLY" || next === "SUSPENDED") setMode(next);
  }, []);
  useEffect(() => {
    // A page restored from the back/forward cache could show another moment's access mode.
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  const value = useMemo<AccountAccess>(
    () => ({
      mode,
      notice: mode === initialMode ? initialNotice : readOnlyNotice(null, billingOwner),
      canWrite: mode !== "READ_ONLY" && mode !== "SUSPENDED",
      blockedText: writeBlockedText(mode ?? "ACTIVE"),
      billingOwner,
      online,
      markReadOnly,
      syncMode,
    }),
    [mode, initialMode, initialNotice, billingOwner, online, markReadOnly, syncMode],
  );
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

const FALLBACK: AccountAccess = {
  mode: null,
  notice: readOnlyNotice(null, false),
  canWrite: true,
  blockedText: writeBlockedText("ACTIVE"),
  billingOwner: false,
  online: true,
  markReadOnly: () => undefined,
  syncMode: () => undefined,
};

/** Access of the active account; outside the account shell it never blocks (the API decides). */
export const useAccountAccess = () => useContext(AccessContext) ?? FALLBACK;

/**
 * Global read-only banner (UI/UX 13.7, 25). The live region is always mounted so a change
 * reported after the page loaded (a late ACCOUNT_READ_ONLY) is announced.
 */
export function ReadOnlyBanner() {
  const { mode, notice } = useAccountAccess();
  return (
    <div aria-live="polite" className="account-banners">
      {mode === "READ_ONLY" && (
        <section className="read-only-banner" aria-labelledby="read-only-title">
          <h2 id="read-only-title">Cuenta en modo lectura</h2>
          <p>
            Puedes consultar y descargar información existente, pero no crear ni modificar
            registros. {notice.reason}
          </p>
          <p>
            {notice.action} <a href="/subscription">Ver suscripción</a>
          </p>
        </section>
      )}
      {mode === "SUSPENDED" && (
        <section className="read-only-banner read-only-banner--suspended" role="alert">
          <h2>Acceso suspendido</h2>
          <p>ICE24 suspendió el acceso a esta cuenta. Contacta a ICE24 para revisar el motivo.</p>
        </section>
      )}
    </div>
  );
}

/** Offline banner (UI/UX 13.4, 18.4): online-only services say so instead of failing silently. */
export function OfflineBanner() {
  const { online } = useAccountAccess();
  return (
    <div aria-live="assertive">
      {!online && (
        <p className="offline-banner">
          <strong>Sin conexión.</strong> Las consultas y cambios de estos servicios necesitan red;
          no se envió ningún cambio. La vista se actualizará cuando vuelva la conexión.
        </p>
      )}
    </div>
  );
}
