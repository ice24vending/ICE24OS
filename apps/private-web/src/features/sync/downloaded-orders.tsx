"use client";
import { useEffect, useState } from "react";
import { ButtonLink } from "@ice24/ui";
import { offlineSessionSchema, type OfflineOrderPackage } from "@ice24/contracts";
import { offlineDb, readLocalOrder } from "./local-orders";
export function DownloadedOrders() {
  const [items, setItems] = useState<OfflineOrderPackage[]>([]);
  const [message, setMessage] = useState("Consultando descargas de este dispositivo…");
  useEffect(() => {
    let live = true;
    void (async () => {
      const response = await fetch("/api/synchronization/health", {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok)
        throw new Error("Inicia sesión como el técnico asignado para consultar sus descargas.");
      const owner = offlineSessionSchema.parse(await response.json());
      const rows = await offlineDb.orders
        .where("scope")
        .equals(JSON.stringify([owner.accountId, owner.userId]))
        .toArray();
      const packets = await Promise.all(
        rows.filter((r) => r.expiresAt > Date.now()).map((r) => readLocalOrder(owner, r.orderId)),
      );
      if (live) {
        setItems(packets.filter((p): p is OfflineOrderPackage => !!p));
        setMessage(
          packets.length
            ? "Disponibles sin conexión en este dispositivo."
            : "Aún no has descargado órdenes. Abre una orden asignada y selecciona Descargar.",
        );
      }
    })().catch((e: unknown) => {
      if (live) setMessage(e instanceof Error ? e.message : "Almacenamiento no disponible.");
    });
    return () => {
      live = false;
    };
  }, []);
  return (
    <section aria-label="Órdenes descargadas">
      <p role="status">{message}</p>
      {items.map((p) => (
        <p key={p.order.id}>
          <ButtonLink
            icon="document"
            variant="secondary"
            href={`/offline-work.html?order=${p.order.id}`}
            onClick={() =>
              sessionStorage.setItem(
                "ice24-offline-scope",
                JSON.stringify({
                  accountId: p.accountId,
                  userId: p.userId,
                  expiresAt: Date.parse(p.lease.expiresAt),
                }),
              )
            }
          >
            {p.order.folio} · {p.order.machineCode}
          </ButtonLink>
        </p>
      ))}
    </section>
  );
}
