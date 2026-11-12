"use client";
import { LiveRegion } from "@ice24/ui";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, ButtonLink, Icon, StatusTag } from "@ice24/ui";
import { offlineRoutePlanSchema, type OfflineRoutePlan } from "@ice24/contracts";
import { OFFLINE_LIMITS } from "@ice24/offline";
import { OFFLINE_TAB_NOTICE } from "./offline-scope";
import { useAccountAccess } from "../account-shell/access-provider";
import { downloadOrder, offlineDeviceId } from "./download-client";
import { localRouteCapacity, readLocalOrder } from "./local-orders";
import {
  downloadRoute,
  planRouteDownload,
  type RouteDownloadResult,
  type RouteCapacity,
} from "./route-downloads";
import "./download-order.css";

const subscribeReady = () => () => {};
export function DownloadRoute({ contextId, csrfToken }: { contextId: string; csrfToken: string }) {
  const access = useAccountAccess();
  const hydrated = useSyncExternalStore(
    subscribeReady,
    () => true,
    () => false,
  );
  const [staleIds, setStaleIds] = useState<string[]>([]);
  const [lastDownload, setLastDownload] = useState<string>();
  const [plan, setPlan] = useState<OfflineRoutePlan>();
  const [capacity, setCapacity] = useState<RouteCapacity>();
  const [availableIds, setAvailableIds] = useState<string[]>([]);
  const [results, setResults] = useState<RouteDownloadResult[]>([]);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const disabled = !hydrated || busy || !access.online || !access.canWrite || !access.userId;
  const disabledReason = !access.online
    ? "Sin conexión: conéctate para consultar la ruta e iniciar y reservar órdenes. Tus descargas anteriores siguen disponibles."
    : !access.canWrite
      ? "Modo lectura: no puedes iniciar ni reservar órdenes. Solicita acceso de escritura."
      : !access.userId
        ? "Inicia sesión para consultar tu ruta."
        : undefined;
  async function preview() {
    if (disabled) return;
    setBusy(true);
    setMessage("Consultando las órdenes de tu ruta…");
    setResults([]);
    setPlan(undefined);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await fetch(
        `/api/synchronization/route-plan?deviceId=${offlineDeviceId()}`,
        {
          cache: "no-store",
          signal: abort.signal,
        },
      );
      if (!response.ok)
        throw new Error("No fue posible consultar tu ruta. Revisa tu conexión y permisos.");
      const next = offlineRoutePlanSchema.parse(await response.json());
      if (next.userId !== access.userId)
        throw new Error("La sesión cambió. Vuelve a abrir la vista.");
      const space = await localRouteCapacity(next);
      const packets = await Promise.all(
        next.items.map(({ order }) => readLocalOrder(next, order.id).catch(() => undefined)),
      );
      const dates = packets
        .filter(Boolean)
        .map((p) => p!.lease.downloadedAt)
        .sort();
      setLastDownload(dates.at(-1));
      setStaleIds(
        next.items
          .filter(
            (item, index) =>
              packets[index] && packets[index]!.order.rowVersion < item.order.rowVersion,
          )
          .map((item) => item.order.id),
      );
      const saved = await Promise.all(
        next.items.map(async ({ order, reservedElsewhere }) =>
          !reservedElsewhere && (await readLocalOrder(next, order.id).catch(() => undefined))
            ? order.id
            : null,
        ),
      );
      if (abort.signal.aborted) return;
      setPlan(next);
      setCapacity(space);
      setAvailableIds(saved.filter((id): id is string => id !== null));
      setMessage(
        next.items.length
          ? saved.filter(Boolean).length === next.items.length
            ? ""
            : "Revisa el espacio antes de confirmar."
          : "No tienes órdenes vigentes para descargar hoy.",
      );
    } catch (error) {
      if (!abort.signal.aborted)
        setMessage(error instanceof Error ? error.message : "No se pudo preparar la ruta.");
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  async function confirm() {
    if (!plan || !capacity || disabled) return;
    const projection = planRouteDownload(plan.items, capacity, availableIds);
    const prior: RouteDownloadResult[] = [
      ...projection.reserved.map(({ order }) => ({
        id: order.id,
        status: "excluded" as const,
        message: "Reservada en otro dispositivo",
      })),
      ...availableIds.map((id) => ({
        id,
        status: "available" as const,
        message: "Ya disponible en este dispositivo; se conserva el trabajo local.",
      })),
      ...projection.excluded.map(({ item, reason }) => ({
        id: item.order.id,
        status: "excluded" as const,
        message: reason,
      })),
    ];
    setBusy(true);
    setResults(prior);
    setMessage(`Descargando ${prior.length} de ${plan.items.length} órdenes…`);
    const abort = new AbortController();
    controller.current = abort;
    const finished = await downloadRoute(projection.selected, {
      signal: abort.signal,
      available: async (item) => {
        const packet = await readLocalOrder(plan, item.order.id);
        return !!packet;
      },
      capacity: () => localRouteCapacity(plan),
      download: (item) =>
        downloadOrder(item.order, {
          userId: plan.userId,
          contextId,
          csrfToken,
          signal: abort.signal,
        }),
      progress: (result, count) => {
        setResults((current) => [...current, result]);
        setMessage(`${count + prior.length} de ${plan.items.length} órdenes procesadas.`);
      },
    });
    if (!abort.signal.aborted) {
      const allResults = [...prior, ...finished];
      const available = allResults.filter((r) =>
        ["available", "downloaded"].includes(r.status),
      ).length;
      setMessage(
        available === plan.items.length
          ? ""
          : `Ruta procesada: ${available} disponibles; ${allResults.length - available} fuera o con fallo. Revisa el resultado de cada orden.`,
      );
      if (finished.some((r) => r.status === "downloaded"))
        setLastDownload(new Date().toISOString());
      setBusy(false);
    }
  }
  return (
    <section
      className="execution-panel offline-download route-download"
      aria-label="Descargar mi ruta"
    >
      <h2>Preparar mi ruta</h2>
      <p>Tus órdenes de hoy, atrasadas y en atención, de la más urgente a la menos urgente.</p>
      {!plan && (
        <Button
          icon="list"
          variant="secondary"
          loading={busy}
          loadingLabel="Consultando ruta…"
          disabled={!!disabled}
          disabledReason={disabledReason}
          onClick={() => void preview()}
        >
          Ver mi ruta
        </Button>
      )}
      {lastDownload && (
        <p>
          Última descarga:{" "}
          <time dateTime={lastDownload}>
            {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(lastDownload),
            )}
          </time>
        </p>
      )}
      {plan && (
        <small>
          Actualizar consulta los cambios disponibles; conserva las capturas y reservas locales.
        </small>
      )}
      {plan && capacity && (
        <RouteDownloadPreview
          plan={plan}
          capacity={capacity}
          results={results}
          availableIds={availableIds}
          staleIds={staleIds}
          disabledReason={disabledReason}
          disabled={!!disabled}
          onConfirm={() => void confirm()}
          onRefresh={() => void preview()}
          downloading={busy}
        />
      )}
      {!plan && (
        <small className="route-download__hint" role="note">
          {OFFLINE_TAB_NOTICE}
        </small>
      )}
      <LiveRegion>{message}</LiveRegion>
    </section>
  );
}

export function RouteDownloadPreview({
  plan,
  capacity,
  results,
  disabled = false,
  disabledReason,
  availableIds = [],
  staleIds = [],
  onConfirm,
  onRefresh = () => {},
  downloading = false,
}: {
  plan: OfflineRoutePlan;
  capacity: RouteCapacity;
  results: RouteDownloadResult[];
  disabled?: boolean;
  disabledReason?: string | undefined;
  availableIds?: readonly string[];
  staleIds?: readonly string[];
  onConfirm: () => void;
  onRefresh?: () => void;
  downloading?: boolean;
}) {
  const available = new Set([
    ...availableIds,
    ...results
      .filter((r) => r.status === "available" || r.status === "downloaded")
      .map((r) => r.id),
  ]);
  const ready =
    plan.items.length > 0 &&
    plan.items.every((item) => !item.reservedElsewhere && available.has(item.order.id));
  const projection = planRouteDownload(plan.items, capacity, [...available]);
  const formatMB = (bytes: number, available = false) =>
    (
      Math.max(0, (available ? Math.floor : Math.ceil)((bytes / 1024 / 1024) * 1000)) / 1000
    ).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
  const estimated = projection.selected.reduce((n, item) => n + item.estimatedBytes, 0);
  const free = Math.min(
    OFFLINE_LIMITS.deviceBytes - capacity.deviceBytes,
    capacity.browserFreeBytes ?? Infinity,
  );
  return (
    <div id="route-preview" className="route-download__preview">
      {!ready && (
        <p>
          {plan.items.length} órdenes en tu ruta · descarga estimada: {formatMB(estimated)} MB ·
          disponibles: {formatMB(free, true)} MB.
        </p>
      )}
      <LiveRegion role="status">
        {staleIds.length > 0 ? (
          <>
            {" "}
            Descarga desactualizada: {staleIds.length} órdenes tienen cambios en el servidor.
            Sincroniza y revisa los conflictos antes de sustituir la copia local; tus capturas se
            conservan.{" "}
          </>
        ) : null}
      </LiveRegion>
      <LiveRegion>
        {ready ? (
          <>
            {staleIds.length
              ? `Descargas conservadas: ${available.size} órdenes · Requieren revisión`
              : `Tu ruta está lista sin conexión: ${available.size} órdenes`}
          </>
        ) : null}
      </LiveRegion>
      {ready && (
        <>
          <Button
            icon="refresh"
            disabled={disabled}
            disabledReason={disabledReason}
            onClick={onRefresh}
          >
            Actualizar descarga
          </Button>
        </>
      )}
      {!ready && !results.length && (
        <p className="route-download__capacity">
          <strong>
            {projection.excluded.length
              ? `No caben ${projection.excluded.length}: ${projection.excluded.map(({ item }) => item.order.folio).join(", ")}`
              : "Cabe todo"}
          </strong>
        </p>
      )}
      {projection.reserved.length > 0 && (
        <p>
          Reservadas en otro dispositivo:{" "}
          {projection.reserved.map(({ order }) => order.folio).join(", ")}. No se incluyen en la
          cantidad ni en el espacio de esta descarga.
        </p>
      )}
      {!ready && (
        <p>
          Según el espacio estimado, sin fotos nuevas. Límite: 50 MB por orden y 250 MB por
          dispositivo. Comprobaremos el espacio de nuevo al guardar. Un fallo no cancela las demás.
        </p>
      )}
      {!ready && availableIds.length > 0 && (
        <p>
          {availableIds.length} ya disponibles en este dispositivo: se conservarán sin volver a
          reservar.
        </p>
      )}
      {!ready && !results.length && projection.selected.length > 0 && (
        <>
          <aside className="route-download__notice" aria-label="Inicio y reserva">
            Estas órdenes pasarán a En atención y quedarán reservadas a este dispositivo.
          </aside>
          <Button
            icon="download"
            disabled={!!disabled || !projection.selected.length}
            disabledReason={
              disabledReason ??
              (!projection.selected.length
                ? "No hay órdenes nuevas que quepan en esta descarga."
                : undefined)
            }
            onClick={onConfirm}
          >
            Descargar mi ruta · {projection.selected.length}{" "}
            {projection.selected.length === 1 ? "orden" : "órdenes"}
          </Button>
        </>
      )}
      {!ready && (results.length > 0 || downloading) && (
        <progress
          aria-label="Avance de descarga"
          max={Math.max(1, plan.items.length)}
          value={results.length}
        />
      )}
      {!ready && results.length > 0 && !downloading && (
        <Button
          icon="refresh"
          onClick={onRefresh}
          disabled={disabled}
          disabledReason={disabledReason}
        >
          Revisar pendientes
        </Button>
      )}
      <small className="route-download__hint" role="note">
        {OFFLINE_TAB_NOTICE}
      </small>
      <ul className="route-download__orders">
        {plan.items.map(({ order, timeZone, reservedElsewhere }) => {
          const result = results.find((r) => r.id === order.id);
          const day = (iso: string) =>
            new Intl.DateTimeFormat("en-CA", {
              timeZone,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date(iso));
          const label =
            order.state === "in_progress"
              ? "En atención"
              : order.dueAt && day(order.dueAt) < day(plan.asOf)
                ? "Atrasada"
                : "Vence hoy";
          const due = order.dueAt
            ? new Intl.DateTimeFormat("es-MX", {
                timeZone,
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(order.dueAt))
            : "Sin fecha límite";
          const exclusion = projection.excluded.find(({ item }) => item.order.id === order.id);
          return (
            <li key={order.id} className="route-download__row">
              <div>
                <strong>
                  {order.folio} · {order.machineCode}
                </strong>
                <p>
                  <StatusTag tone={label === "Atrasada" ? "warning" : "info"}>{label}</StatusTag> ·
                  Fecha límite: {due} ({timeZone})
                </p>
                <small className="route-download__availability">
                  {available.has(order.id) && <Icon name="check-circle" />}
                  {staleIds.includes(order.id)
                    ? "Desactualizada · Requiere sincronización"
                    : reservedElsewhere
                      ? "Reservada en otro dispositivo"
                      : (result?.message ??
                        (availableIds.includes(order.id)
                          ? "Ya disponible en este dispositivo"
                          : (exclusion?.reason ??
                            (results.length
                              ? "Pendiente de descarga"
                              : "Se incluirá al confirmar"))))}
                </small>
              </div>
              {(result || available.has(order.id)) && (
                <ButtonLink
                  icon="document"
                  variant="secondary"
                  size="sm"
                  href={
                    available.has(order.id)
                      ? `/offline-work.html?order=${order.id}`
                      : `/maintenance/work-orders/${order.id}`
                  }
                >
                  {available.has(order.id) ? "Abrir" : "Revisar orden"}
                </ButtonLink>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
