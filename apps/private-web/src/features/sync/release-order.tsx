"use client";
import { useRef, useState } from "react";
import { Button } from "@ice24/ui";
import type { WorkOrder } from "@ice24/contracts";
export function ReleaseOrder({
  order,
  contextId,
  csrfToken,
  disabled,
}: {
  order: WorkOrder;
  contextId: string;
  csrfToken: string;
  disabled: boolean;
}) {
  const [reason, setReason] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const attempt = useRef<{ reason: string; key: string } | null>(null);
  if (process.env.NEXT_PUBLIC_ICE24_OFFLINE_SHELL !== "1") return null;
  async function release() {
    setBusy(true);
    try {
      if (attempt.current?.reason !== reason)
        attempt.current = { reason, key: crypto.randomUUID() };
      const body = new FormData();
      body.set("data", JSON.stringify({ reason }));
      body.set("key", attempt.current.key);
      body.set("version", String(order.rowVersion));
      body.set("csrfToken", csrfToken);
      const response = await fetch(`/api/synchronization/orders/${order.id}/release`, {
        method: "POST",
        headers: { "x-ice24-workspace-context": contextId },
        body,
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok)
        throw new Error((await response.json()).message ?? "No fue posible liberar la descarga.");
      setMessage(
        "Descarga liberada y motivo registrado. Actualiza la orden antes de continuar. El técnico recibirá un conflicto al sincronizar.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Conexión interrumpida.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="execution-panel">
      <summary>Liberar descarga de un dispositivo</summary>
      <p>
        Úsalo para recuperar una orden bloqueada. Los cambios pendientes del técnico no se aplicarán
        automáticamente.
      </p>
      <label htmlFor="release-reason">Motivo de liberación</label>
      <textarea
        id="release-reason"
        minLength={5}
        maxLength={1000}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={disabled || busy}
      />
      <Button
        icon="refresh"
        variant="secondary"
        disabled={disabled || reason.trim().length < 5}
        loading={busy}
        onClick={() => void release()}
      >
        Confirmar liberación
      </Button>
      <p role="status">{message}</p>
    </details>
  );
}
