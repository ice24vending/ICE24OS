"use client";
import { useRef, useState } from "react";
import { Button, ButtonLink } from "@ice24/ui";
import { offlineOrderPackageSchema, type WorkOrder } from "@ice24/contracts";
import { requestPersistentStorage, OFFLINE_LIMITS } from "@ice24/offline";
import { useAccountAccess } from "../account-shell/access-provider";
import { storeLocalOrder } from "./local-orders";
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
  const attempt = useRef<{ key: string; deviceId: string; version: number } | null>(null);
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
      const storage = await navigator.storage.estimate();
      if (storage.quota !== undefined && storage.quota - (storage.usage ?? 0) < estimated * 3)
        throw new Error("No hay espacio suficiente. Libera almacenamiento antes de descargar.");
      await requestPersistentStorage(navigator.storage);
      const attemptKey = `ice24-download:${access.userId}:${order.id}`;
      const saved: unknown = JSON.parse(localStorage.getItem(attemptKey) ?? "null");
      if (
        saved &&
        typeof saved === "object" &&
        "key" in saved &&
        typeof saved.key === "string" &&
        "deviceId" in saved &&
        typeof saved.deviceId === "string" &&
        "version" in saved &&
        typeof saved.version === "number"
      )
        attempt.current = { key: saved.key, deviceId: saved.deviceId, version: saved.version };
      let deviceId = localStorage.getItem("ice24-offline-device");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("ice24-offline-device", deviceId);
      }
      attempt.current ??= {
        key: crypto.randomUUID(),
        deviceId,
        version: order.rowVersion,
      };
      // Only non-secret retry identifiers; never credentials or signed upload URLs.
      localStorage.setItem(attemptKey, JSON.stringify(attempt.current));
      const form = new FormData();
      form.set("data", JSON.stringify({ deviceId: attempt.current.deviceId }));
      form.set("key", attempt.current.key);
      form.set("version", String(attempt.current.version));
      form.set("csrfToken", csrfToken);
      const response = await fetch(`/api/synchronization/orders/${order.id}/download`, {
        method: "POST",
        headers: { "x-ice24-workspace-context": contextId },
        body: form,
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status === 409) {
        localStorage.removeItem(attemptKey);
        attempt.current = null;
      }
      if (!response.ok)
        throw new Error((await response.json()).message ?? "No fue posible descargar la orden.");
      const packet = offlineOrderPackageSchema.parse(await response.json());
      await storeLocalOrder(packet);
      sessionStorage.setItem(
        "ice24-offline-scope",
        JSON.stringify({
          accountId: packet.accountId,
          userId: packet.userId,
          expiresAt: packet.localTime?.expiresAt ?? Date.parse(packet.lease.expiresAt),
        }),
      );
      await navigator.serviceWorker.register("/sw.js?offline=1");
      await navigator.serviceWorker.ready;
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
          Descarga la orden, procedimiento, checklist y requisitos. Tamaño aproximado:{" "}
          {Math.ceil(estimated / 1024)} KB, sin fotos nuevas.
        </p>
      )}
      <p>
        Propuesta F7-D03: {Math.ceil(estimated / 1024)} KB aprox., vigencia de 72 h; hasta{" "}
        {OFFLINE_LIMITS.orderBytes / 1024 / 1024} MB por orden. Al descargar se inicia y reserva
        para este dispositivo.
      </p>
      {available ? (
        <ButtonLink icon="document" href={`/offline-work.html?order=${order.id}`}>
          Abrir orden descargada
        </ButtonLink>
      ) : (
        <Button
          icon="download"
          variant="secondary"
          loading={busy}
          disabled={!access.online || !access.canWrite}
          onClick={() => void download()}
        >
          Descargar para trabajar sin conexión
        </Button>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
