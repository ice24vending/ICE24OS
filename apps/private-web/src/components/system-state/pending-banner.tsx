"use client";
import { OfflineAccessMonitor } from "../../features/sync/offline-access-monitor";
import { Banner, ButtonLink, SyncStatus } from "@ice24/ui";
import { useEffect } from "react";
import { synchronizeLocal } from "../../features/sync/synchronize";
import { useAccountAccess } from "../../features/account-shell/access-provider";
import { usePendingOperations, useLocalStorageProblem } from "./local-data";

const changes = (count: number) => (count === 1 ? "1 cambio" : `${count} cambios`);

/**
 * Global indicator of the local queue (UI_UX §20.1, §20.5): how many changes live only on this
 * device and where to send them. The live region is always mounted so a new entry is announced.
 */
export function PendingOperationsBanner({ accountId }: { accountId: string | null }) {
  const { online, userId, canWrite } = useAccountAccess();
  const pending = usePendingOperations(accountId);
  const hasWorkOrders = pending.some(
    (op) => op.action === "work-order-photo" || op.action === "work-order-close",
  );
  useEffect(() => {
    if (
      process.env.NEXT_PUBLIC_ICE24_OFFLINE_SHELL !== "1" ||
      !accountId ||
      !userId ||
      !online ||
      !canWrite ||
      !hasWorkOrders
    )
      return;
    let stopped = false,
      running = false;
    const sync = async () => {
      if (stopped || running) return;
      running = true;
      try {
        for (let i = 0; i < 10 && !stopped; i++)
          if (!(await synchronizeLocal({ accountId, userId }))) break;
      } catch {
        /* Queue retains the data and exposes retry state in its live indicator. */
      } finally {
        running = false;
      }
    };
    void sync();
    const timer = window.setInterval(() => void sync(), 10_000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [accountId, userId, online, canWrite, hasWorkOrders]);
  const problem = useLocalStorageProblem();
  const href = hasWorkOrders
    ? "/maintenance/synchronization"
    : pending.find((operation) => operation.href)?.href;
  return (
    <div aria-live="polite">
      <OfflineAccessMonitor accountId={accountId} userId={userId} />
      {problem && <SyncStatus state={problem} variant="panel" />}
      {pending.length > 0 && (
        <Banner
          tone={online ? "warning" : "offline"}
          title={`${changes(pending.length)} guardado${pending.length === 1 ? "" : "s"} solo en este dispositivo`}
          titleAs="p"
          className="pending-banner"
          actions={
            href ? (
              <ButtonLink href={href} variant="secondary" size="sm">
                Ver pendientes
              </ButtonLink>
            ) : undefined
          }
        >
          {online
            ? hasWorkOrders
              ? "Las órdenes se sincronizan al verificar la conexión. Consulta el avance en «Ver pendientes». Cerrar sesión elimina los datos locales."
              : "Hay conexión: envíalos desde «Ver pendientes». Cerrar sesión los elimina."
            : "Se podrán enviar cuando vuelva la red. No cierres sesión: se eliminarían."}
        </Banner>
      )}
    </div>
  );
}
