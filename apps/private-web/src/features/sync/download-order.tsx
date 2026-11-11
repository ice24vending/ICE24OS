"use client";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@ice24/ui";
import { type WorkOrder } from "@ice24/contracts";
import { OFFLINE_LIMITS } from "@ice24/offline";
import { useAccountAccess } from "../account-shell/access-provider";
import { readOfflineScope } from "./offline-scope";
import { readLocalOrder } from "./local-orders";
import { downloadOrder } from "./download-client";
import "./download-order.css";
export function DownloadOrder({
  order,
  contextId,
  csrfToken,
  compact = false,
}: {
  order: WorkOrder;
  contextId: string;
  csrfToken: string;
  compact?: boolean;
}) {
  const access = useAccountAccess();
  const [busy, setBusy] = useState(false),
    [available, setAvailable] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      void (async () => {
        const owner = readOfflineScope();
        if (owner.userId !== access.userId) return;
        const packet = await readLocalOrder(owner, order.id);
        if (live && packet) {
          setAvailable(true);
          setMessage(
            packet.order.rowVersion < order.rowVersion
              ? "Descarga desactualizada. Sincroniza y revisa los cambios antes de sustituirla."
              : "Descargada en este dispositivo.",
          );
        }
      })().catch(() => {});
    }, 0);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [access.userId, order.id, order.rowVersion]);
  if (
    process.env.NEXT_PUBLIC_ICE24_OFFLINE_SHELL !== "1" ||
    access.userId !== order.assigneeId ||
    !["scheduled", "upcoming", "overdue", "in_progress"].includes(order.state)
  )
    return null;
  const estimated = new Blob([JSON.stringify(order)]).size;
  async function download() {
    setBusy(true);
    setMessage("Verificando espacio y descargando…");
    try {
      await downloadOrder(order, { userId: access.userId!, contextId, csrfToken });
      setAvailable(true);
      setMessage("Disponible sin conexión. Abre la orden antes de salir a campo.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible guardar la descarga. Reintenta en este dispositivo; no se perderá el bloqueo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={compact ? "offline-download" : "execution-panel offline-download"}
      aria-label="Trabajo sin conexión"
    >
      {!compact && <h3>Preparar trabajo sin conexión</h3>}
      {!compact && (
        <p>
          Descarga la orden, procedimiento, checklist y requisitos. No incluye las fotos que
          captures después.
        </p>
      )}
      {!compact && (
        <p>
          Tamaño aproximado: {Math.ceil(estimated / 1024)} KB · disponible hasta 72 horas desde la
          descarga; máximo {OFFLINE_LIMITS.orderBytes / 1024 / 1024} MB por orden. Al descargar se
          inicia y reserva para este dispositivo.
        </p>
      )}
      {available ? (
        <ButtonLink
          variant="secondary"
          icon="document"
          href={`/offline-work.html?order=${order.id}`}
        >
          {compact ? "Abrir descarga" : "Abrir orden descargada"}
        </ButtonLink>
      ) : (
        <Button
          icon="download"
          variant="secondary"
          loading={busy}
          disabled={!access.online || !access.canWrite}
          disabledReason={
            !access.online
              ? "Necesitas conexión para descargar esta orden."
              : !access.canWrite
                ? "Modo consulta: no puedes iniciar ni reservar órdenes."
                : undefined
          }
          onClick={() => void download()}
        >
          {compact ? "Descargar" : "Descargar para trabajar sin conexión"}
        </Button>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
