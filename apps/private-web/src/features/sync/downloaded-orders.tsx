"use client";
import { useEffect, useState } from "react";
import "./download-order.css";
import { ButtonLink, Card } from "@ice24/ui";
import { offlineSessionSchema, type OfflineOrderPackage } from "@ice24/contracts";
import { offlineDb, readLocalOrder } from "./local-orders";
import {
  readOfflineScope,
  OFFLINE_TAB_NOTICE,
  readOfflineExpiry,
  rememberOfflineExpiry,
} from "./offline-scope";
import { verifyOfflineAccess, PURGED_EVENT } from "./lifecycle";

export function DownloadedOrders() {
  const [items, setItems] = useState<OfflineOrderPackage[]>([]);
  const [expiredCount, setExpiredCount] = useState<number>();
  const [message, setMessage] = useState("Consultando descargas de este dispositivo…");
  useEffect(() => {
    let live = true,
      generation = 0;
    async function load() {
      const request = ++generation;
      try {
        setExpiredCount(undefined);
        let owner;
        if (navigator.onLine) {
          // The OS may report a connection without Internet. Transport/service failure
          // falls back to the tab scope; an explicit session denial never does.
          let response: Response | undefined;
          try {
            response = await fetch("/api/synchronization/health", {
              cache: "no-store",
              signal: AbortSignal.timeout(5000),
            });
          } catch {
            owner = readOfflineScope();
          }
          if (response?.status && response.status >= 500) owner = readOfflineScope();
          else if (response) {
            if (!response.ok)
              throw new Error(
                "Inicia sesión como el técnico asignado para consultar sus descargas.",
              );
            owner = offlineSessionSchema.parse(await response.json());
          }
        } else owner = readOfflineScope();
        if (!owner) throw new Error("No fue posible verificar el alcance local.");
        const rows = await offlineDb.orders
          .where("scope")
          .equals(JSON.stringify([owner.accountId, owner.userId]))
          .toArray();
        const priorExpiry = readOfflineExpiry(owner);
        if (!rows.length && priorExpiry !== undefined) {
          if (live && request === generation) {
            setItems([]);
            setExpiredCount(priorExpiry);
            setMessage(
              "Las descargas vencidas se eliminaron. Reconecta para verificar tu acceso y preparar de nuevo tu ruta.",
            );
          }
          return;
        }
        const expired = rows.filter((r) => r.expiresAt <= Date.now()).length;
        if (expired && expired === rows.length) {
          rememberOfflineExpiry(owner, expired);
          if (live && request === generation) {
            setItems([]);
            setExpiredCount(expired);
            setMessage(
              "Reconecta para verificar tus permisos y preparar de nuevo tu ruta. No puedes abrir descargas vencidas.",
            );
          }
          await verifyOfflineAccess(owner);
          return;
        }
        await verifyOfflineAccess(owner);
        const packets = await Promise.all(
          rows.filter((r) => r.expiresAt > Date.now()).map((r) => readLocalOrder(owner, r.orderId)),
        );
        if (live && request === generation) {
          const available = packets.filter((p): p is OfflineOrderPackage => !!p);
          setItems(available);
          setMessage(
            available.length
              ? `${available.length} órdenes disponibles en este dispositivo.`
              : "Aún no has descargado órdenes. Conéctate y abre Ver mi ruta para prepararlas.",
          );
        }
      } catch (e) {
        // An expired hint may identify a count, never unlock or enumerate another owner.
        try {
          const raw = JSON.parse(sessionStorage.getItem("ice24-offline-scope") ?? "null");
          const parsed = offlineSessionSchema
            .pick({ accountId: true, userId: true })
            .safeParse(raw);
          if (parsed.success && typeof raw.expiresAt === "number" && raw.expiresAt <= Date.now()) {
            const rows = await offlineDb.orders
              .where("scope")
              .equals(JSON.stringify([parsed.data.accountId, parsed.data.userId]))
              .toArray();
            if (live && request === generation) setExpiredCount(rows.length);
          }
        } catch {
          /* No identity or blocked storage: never guess from other records. */
        }
        if (live && request === generation) {
          setItems([]);
          setMessage(e instanceof Error ? e.message : "Almacenamiento no disponible.");
        }
      }
    }
    const refresh = () => void load();
    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    const purged = () => {
      ++generation;
      setItems([]);
      refresh();
    };
    window.addEventListener(PURGED_EVENT, purged);
    const channel =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(PURGED_EVENT) : undefined;
    if (channel) channel.onmessage = purged;
    const timer = setInterval(refresh, 60_000);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener(PURGED_EVENT, purged);
      channel?.close();
    };
  }, []);
  return <DownloadedOrdersList items={items} message={message} expiredCount={expiredCount} />;
}
export function DownloadedOrdersList({
  items,
  message,
  expiredCount,
}: {
  items: OfflineOrderPackage[];
  message: string;
  expiredCount?: number | undefined;
}) {
  const date = (value: string | number) =>
    new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(value),
    );
  return (
    <section className="downloaded-orders" aria-label="Órdenes descargadas">
      {expiredCount !== undefined && (
        <>
          <h2>Tu acceso sin conexión venció</h2>
          <p>
            {expiredCount} órdenes guardadas al comprobar el vencimiento. Reconecta para verificar
            tu acceso; las descargas vencidas se eliminan según la política local.
          </p>
        </>
      )}
      {items.length > 0 && <p role="status">Tus órdenes descargadas siguen disponibles.</p>}
      <p role="status">{message}</p>
      <small role="note">{OFFLINE_TAB_NOTICE}</small>
      {items.map((p) => (
        <Card key={p.order.id} title={`${p.order.folio} · ${p.order.machineCode}`}>
          <p>
            Estado:{" "}
            {
              {
                scheduled: "Programado",
                upcoming: "Próximo",
                overdue: "Vencido",
                in_progress: "En atención",
                completed: "Completado",
                with_observations: "Con observaciones",
                nonconforming: "No conforme",
                corrected: "Corregido",
                cancelled: "Anulado",
              }[p.order.state]
            }
          </p>
          <p>Fecha límite: {p.order.dueAt ? date(p.order.dueAt) : "Sin fecha límite"}</p>
          <p>Descarga válida hasta: {date(p.localTime?.expiresAt ?? p.lease.expiresAt)}</p>
          <ButtonLink
            icon="document"
            variant="secondary"
            href={`/offline-work.html?order=${p.order.id}`}
          >
            Trabajar sin conexión
          </ButtonLink>
        </Card>
      ))}
    </section>
  );
}
