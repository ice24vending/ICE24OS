"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  notificationPageSchema,
  notificationResourceTypeSchema,
  notificationSchema,
  notificationSummarySchema,
  type Notification,
  type NotificationAction,
  type NotificationPage,
  type NotificationPriority,
  type NotificationStatus,
  type NotificationSummary,
} from "@ice24/contracts";
import { emailDeliveryText } from "./email-status";

export const statusLabels: Record<NotificationStatus, string> = {
  unread: "No leída",
  read: "Leída",
  acknowledged: "Enterado",
  in_progress: "En atención",
  resolved: "Resuelta",
};
const priorityLabels: Record<NotificationPriority, string> = {
  critical: "Crítica",
  high: "Alta",
  warning: "Advertencia",
  info: "Informativa",
};
const FILTERS = [
  { id: "all", label: "Todas", query: "" },
  { id: "critical", label: "Críticas", query: "priority=critical" },
  { id: "unacknowledged", label: "No enteradas", query: "unacknowledged=true" },
  { id: "in_progress", label: "En atención", query: "status=in_progress" },
  { id: "resolved", label: "Resueltas", query: "status=resolved" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];
/** Bell and counters refresh on this interval and whenever the tab becomes visible. */
export const SUMMARY_REFRESH_MS = 30_000;

const elapsed = (value: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 60_000));
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} días`;
};
const date = (value: string | null) =>
  value === null
    ? "—"
    : new Intl.DateTimeFormat("es-MX", {
        dateStyle: "short",
        timeStyle: "short",
        hour12: false,
        timeZone: "UTC",
      }).format(new Date(value)) + " UTC";
/** The alert's own source is the resource its attention and resolution link to. */
const linkable = (notification: Notification) => {
  const resource = notification.relatedResource;
  const type = notificationResourceTypeSchema.safeParse(resource?.type);
  return resource && type.success ? { type: type.data, id: resource.id } : null;
};

const channelLabels: Record<string, string> = {
  in_app: "Centro de avisos",
  browser_push: "Navegador",
  email: "Correo",
};
export const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;
export function summaryText(summary: NotificationSummary) {
  return [
    plural(summary.pinned, "crítica sin enterado", "críticas sin enterado"),
    `${summary.inProgress} en atención`,
    plural(summary.resolved, "resuelta", "resueltas"),
  ].join(" · ");
}

function Card({
  notification,
  busy,
  onAction,
  onOpen,
  open,
}: {
  notification: Notification;
  busy: boolean;
  onAction: (notification: Notification, action: NotificationAction) => void;
  onOpen: (notification: Notification) => void;
  open: boolean;
}) {
  const resource = linkable(notification);
  const canAcknowledge = notification.status === "unread" || notification.status === "read";
  const canAttend = resource !== null && canAcknowledge;
  const canAttendAcknowledged = resource !== null && notification.status === "acknowledged";
  const canResolve =
    resource !== null &&
    (notification.status === "acknowledged" || notification.status === "in_progress");
  const detailId = `notification-detail-${notification.id}`;
  return (
    <li
      className={`alert-card alert-card--${notification.priority}${notification.pinned ? " alert-card--pinned" : ""}`}
    >
      <div className="alert-card__head">
        <span className={`alert-priority alert-priority--${notification.priority}`}>
          {priorityLabels[notification.priority]}
        </span>
        <span className={`alert-status alert-status--${notification.status.replace("_", "-")}`}>
          {statusLabels[notification.status]}
        </span>
        <span className="alert-time">{elapsed(notification.occurredAt)}</span>
      </div>
      <h3>{notification.title}</h3>
      <p>{notification.message}</p>
      {notification.pinned && (
        <p className="alert-note">
          Fijada hasta que marques «Enterado». Leerla no la quita de esta lista.
        </p>
      )}
      <div className="alert-actions">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailId}
          onClick={() => onOpen(notification)}
        >
          {open ? "Ocultar detalle" : "Ver detalle"}
        </button>
        {canAcknowledge && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(notification, "acknowledge")}
          >
            Marcar enterado
          </button>
        )}
        {(canAttend || canAttendAcknowledged) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(notification, "start-attention")}
          >
            Atender
          </button>
        )}
        {canResolve && (
          <button
            type="button"
            disabled={busy || notification.conditionOpen}
            aria-describedby={notification.conditionOpen ? `${detailId}-blocked` : undefined}
            onClick={() => onAction(notification, "resolve")}
          >
            Marcar resuelta
          </button>
        )}
        {notification.action && <a href={notification.action.href}>{notification.action.label}</a>}
      </div>
      {canResolve && notification.conditionOpen && (
        <p id={`${detailId}-blocked`} className="alert-note">
          Se podrá resolver cuando la causa esté cerrada (por ejemplo, el pago regularizado).
        </p>
      )}
      {open && (
        <dl id={detailId} className="alert-detail">
          {Object.entries({
            Tipo: notification.type,
            Ocurrió: date(notification.occurredAt),
            Leída: date(notification.readAt),
            Enterado: date(notification.acknowledgedAt),
            "En atención": date(notification.inProgressAt),
            Resuelta: date(notification.resolvedAt),
            Canales:
              notification.sentChannels.map((channel) => channelLabels[channel]).join(", ") || "—",
            "Condición vinculada": notification.conditionOpen ? "Abierta" : "Cerrada",
            ...(notification.emailDelivery
              ? { Correo: emailDeliveryText(notification.emailDelivery) }
              : {}),
          }).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

export function NotificationCenter({
  contextId,
  csrfToken,
  initialSummary,
  initialPinned,
  initialPage,
  initialError,
}: {
  contextId: string;
  csrfToken: string;
  initialSummary: NotificationSummary | null;
  initialPinned: NotificationPage | null;
  initialPage: NotificationPage | null;
  initialError: string;
}) {
  const [summary, setSummary] = useState(initialSummary),
    [pinned, setPinned] = useState(initialPinned?.items ?? []),
    [items, setItems] = useState(initialPage?.items ?? []),
    [nextCursor, setNextCursor] = useState(initialPage?.page.nextCursor ?? null),
    [filter, setFilter] = useState<FilterId>("all"),
    [error, setError] = useState(initialError),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [openId, setOpenId] = useState<string | null>(null);
  const headers = useRef({ "x-ice24-workspace-context": contextId });
  // One key per notification and action: an ambiguous network failure retries with the same key.
  const keys = useRef<Record<string, string>>({});
  const filterRef = useRef<FilterId>("all");

  const readJson = async (response: Response) => {
    const body = (await response.json()) as unknown;
    if (!response.ok)
      throw new Error(
        (body as { message?: string }).message ?? "No fue posible consultar las alertas.",
      );
    return body;
  };
  const fetchPage = useCallback(async (query: string, cursor: string | null = null) => {
    const params = new URLSearchParams(query);
    params.set("limit", "20");
    if (cursor) params.set("cursor", cursor);
    const response = await fetch(`/api/notifications?${params}`, {
      cache: "no-store",
      headers: headers.current,
    });
    return notificationPageSchema.parse(await readJson(response));
  }, []);
  const refresh = useCallback(
    async (target: FilterId = filterRef.current) => {
      setError("");
      try {
        const query = FILTERS.find((f) => f.id === target)!.query;
        const [summaryResponse, pinnedPage, page] = await Promise.all([
          fetch("/api/notifications?view=summary", { cache: "no-store", headers: headers.current }),
          fetchPage("pinned=true"),
          fetchPage(query),
        ]);
        setSummary(notificationSummarySchema.parse(await readJson(summaryResponse)));
        setPinned(pinnedPage.items);
        setItems(page.items);
        setNextCursor(page.page.nextCursor);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No fue posible consultar las alertas.");
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    // Live indicators without push: poll while visible and refresh when the tab returns.
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(tick, SUMMARY_REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", restore);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("pageshow", restore);
    };
  }, [refresh]);

  async function act(notification: Notification, action: NotificationAction) {
    setBusy(true);
    setMessage("");
    try {
      const body = new FormData();
      body.set("csrfToken", csrfToken);
      body.set("key", (keys.current[`${notification.id}:${action}`] ??= crypto.randomUUID()));
      const resource = linkable(notification);
      if (resource && (action === "start-attention" || action === "resolve")) {
        body.set("resourceType", resource.type);
        body.set("resourceId", resource.id);
      }
      const response = await fetch(`/api/notifications/${notification.id}/${action}`, {
        method: "POST",
        body,
        headers: headers.current,
      });
      const updated = notificationSchema.parse(await readJson(response));
      // Confirm only once the refreshed lists are on screen, never next to a stale view.
      await refresh();
      if (action !== "read")
        setMessage(
          `«${updated.title}»: ${statusLabels[updated.status]}. El cambio quedó auditado.`,
        );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No fue posible actualizar el aviso.");
    } finally {
      setBusy(false);
    }
  }
  function open(notification: Notification) {
    const opening = openId !== notification.id;
    setOpenId(opening ? notification.id : null);
    // Opening an alert marks it read, never acknowledged (UI/UX 26.2).
    if (opening && notification.status === "unread") void act(notification, "read");
  }
  async function loadMore() {
    if (!nextCursor) return;
    setBusy(true);
    try {
      const page = await fetchPage(FILTERS.find((f) => f.id === filter)!.query, nextCursor);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.page.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar más alertas.");
    } finally {
      setBusy(false);
    }
  }
  // Under "Todas" the pinned alerts are already listed above.
  const visible = items.filter((notification) => !(filter === "all" && notification.pinned));
  function choose(next: FilterId) {
    filterRef.current = next;
    setFilter(next);
    void refresh(next);
  }

  return (
    <main id="main-content" className="alert-layout">
      <nav aria-label="Navegación del centro de alertas">
        <a href="/workspace">← Espacio de trabajo</a>
      </nav>
      <header>
        <p className="eyebrow">Avisos y alertas</p>
        <h1>Centro de alertas</h1>
        {summary && (
          <p role="status" className="alert-summary">
            {summaryText(summary)}
          </p>
        )}
        <p className="alert-help">
          «Enterado» confirma que viste la alerta y la desfija, pero no la resuelve. «Resuelta» sólo
          es posible cuando la causa vinculada ya está cerrada. Fechas en UTC.
        </p>
      </header>
      {error && (
        <section role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void refresh()}>
            Reintentar consulta
          </button>
        </section>
      )}
      {message && (
        <p role="status" className="alert-message">
          {message}
        </p>
      )}
      {pinned.length > 0 && (
        <section aria-labelledby="pinned-heading" className="alert-section">
          <h2 id="pinned-heading">Críticas sin enterado</h2>
          <ul className="alert-list">
            {pinned.map((notification) => (
              <Card
                key={`pinned-${notification.id}`}
                notification={notification}
                busy={busy}
                onAction={(n, a) => void act(n, a)}
                onOpen={open}
                open={openId === notification.id}
              />
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="all-heading" className="alert-section">
        <h2 id="all-heading">Alertas</h2>
        <div role="group" aria-label="Filtrar alertas" className="alert-filters">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={filter === option.id}
              disabled={busy}
              onClick={() => choose(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {visible.length === 0 ? (
          <p>
            {filter === "all"
              ? pinned.length > 0
                ? "No hay otras alertas."
                : "No tienes alertas pendientes."
              : "No hay alertas que coincidan con este filtro."}
          </p>
        ) : (
          <ul className="alert-list">
            {visible.map((notification) => (
              <Card
                key={notification.id}
                notification={notification}
                busy={busy}
                onAction={(n, a) => void act(n, a)}
                onOpen={open}
                open={openId === notification.id}
              />
            ))}
          </ul>
        )}
        {nextCursor && (
          <button type="button" disabled={busy} onClick={() => void loadMore()}>
            Cargar más alertas
          </button>
        )}
      </section>
    </main>
  );
}
