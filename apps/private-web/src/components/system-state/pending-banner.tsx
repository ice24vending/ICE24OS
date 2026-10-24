"use client";
import { Banner, ButtonLink } from "@ice24/ui";
import { useAccountAccess } from "../../features/account-shell/access-provider";
import { usePendingOperations } from "./local-data";

const changes = (count: number) => (count === 1 ? "1 cambio" : `${count} cambios`);

/**
 * Global indicator of the local queue (UI_UX §20.1, §20.5): how many changes live only on this
 * device and where to send them. The live region is always mounted so a new entry is announced.
 */
export function PendingOperationsBanner({ accountId }: { accountId: string | null }) {
  const { online } = useAccountAccess();
  const pending = usePendingOperations(accountId);
  const href = pending.find((operation) => operation.href)?.href;
  return (
    <div aria-live="polite">
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
            ? "Hay conexión: envíalos desde «Ver pendientes». Cerrar sesión los elimina."
            : "Se podrán enviar cuando vuelva la red. No cierres sesión: se eliminarían."}
        </Banner>
      )}
    </div>
  );
}
