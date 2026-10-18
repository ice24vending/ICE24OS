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
  type NotificationStatus,
  type NotificationSummary,
} from "@ice24/contracts";
import { ALERT_STATUSES, CriticalAlert } from "@ice24/ui";
import { emailDeliveryText } from "./email-status";
import { useAccountAccess } from "../account-shell/access-provider";
import { request, toFailure, type Failure, type FailureKind } from "../account-shell/failure";
import { ServiceState } from "../account-shell/service-state";

/** Status names of the CriticalAlert card (F6-04), reused in the confirmation message. */
const statusLabel = (status: NotificationStatus) => ALERT_STATUSES[status].label;
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

/** Failure of a transition, kept with the alert it belongs to so the card can explain it. */
interface ActionFailure {
  readonly failure: Failure;
  readonly notificationId: string;
  readonly action: NotificationAction;
}
/** Conflicts and plain errors are recoverable inside the card; the rest are page states. */
const inCard = (failure: Failure) => failure.kind === "conflict" || failure.kind === "error";

function Card({
  notification,
  busy,
  pending,
  online,
  failure,
  onAction,
  onOpen,
  onRefresh,
  open,
}: {
  notification: Notification;
  busy: boolean;
  pending: NotificationAction | null;
  online: boolean;
  failure: ActionFailure | null;
  onAction: (notification: Notification, action: NotificationAction) => void;
  onOpen: (notification: Notification) => void;
  onRefresh: () => void;
  open: boolean;
}) {
  const resource = linkable(notification);
  const transition = (action: NotificationAction) => () => onAction(notification, action);
  // "read" (sent when opening the detail) has no button; while it runs every action waits, so
  // no transition leaves with the version from before the read.
  const own = pending === "read" ? null : pending;
  return (
    <CriticalAlert
      as="li"
      className="alert-card"
      title={notification.title}
      message={<p>{notification.message}</p>}
      priority={notification.priority}
      status={notification.status}
      pinned={notification.pinned}
      version={notification.audit.version}
      elapsed={elapsed(notification.occurredAt)}
      occurredAt={notification.occurredAt}
      onAcknowledge={transition("acknowledge")}
      // Attention and resolution link the alert's own source (F5-11); without one, no button.
      onAttend={resource ? transition("start-attention") : undefined}
      onResolve={resource ? transition("resolve") : undefined}
      resolveBlockedReason={
        notification.conditionOpen
          ? "Se podrá resolver cuando la causa esté cerrada (por ejemplo, el pago regularizado)."
          : undefined
      }
      pending={own}
      actionsDisabledReason={
        !online
          ? "Necesitas conexión para actualizar el aviso."
          : busy && own === null
            ? "Espera a que termine la acción en curso."
            : undefined
      }
      feedback={
        failure && {
          kind: failure.failure.kind === "conflict" ? "conflict" : "error",
          message: failure.failure.message,
        }
      }
      onRefresh={onRefresh}
      // Same version, same idempotency key: a retry after an ambiguous error never duplicates.
      onRetryFeedback={failure ? () => onAction(notification, failure.action) : undefined}
      detailOpen={open}
      onToggleDetail={() => onOpen(notification)}
      action={notification.action}
      detail={
        <dl className="alert-detail">
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
      }
    />
  );
}

export function NotificationCenter({
  contextId,
  csrfToken,
  initialSummary,
  initialPinned,
  initialPage,
  initialFailure,
}: {
  contextId: string;
  csrfToken: string;
  initialSummary: NotificationSummary | null;
  initialPinned: NotificationPage | null;
  initialPage: NotificationPage | null;
  initialFailure: { kind: FailureKind; message: string } | null;
}) {
  const { online } = useAccountAccess();
  const [summary, setSummary] = useState(initialSummary),
    [pinned, setPinned] = useState(initialPinned?.items ?? []),
    [items, setItems] = useState(initialPage?.items ?? []),
    [nextCursor, setNextCursor] = useState(initialPage?.page.nextCursor ?? null),
    [filter, setFilter] = useState<FilterId>("all"),
    [failure, setFailure] = useState<Failure | { kind: FailureKind; message: string } | null>(
      initialFailure,
    ),
    [message, setMessage] = useState(""),
    [actionFailure, setActionFailure] = useState<ActionFailure | null>(null),
    [pending, setPending] = useState<{ id: string; action: NotificationAction } | null>(null),
    [busy, setBusy] = useState(false),
    [openId, setOpenId] = useState<string | null>(null);
  const headers = useRef({ "x-ice24-workspace-context": contextId });
  // One key per notification and action: an ambiguous network failure retries with the same key.
  const keys = useRef<Record<string, string>>({});
  const filterRef = useRef<FilterId>("all");

  const get = useCallback(
    async (path: string): Promise<unknown> =>
      (
        await request(
          path,
          { cache: "no-store", headers: headers.current },
          "No fue posible consultar las alertas.",
        )
      ).json(),
    [],
  );
  const fetchPage = useCallback(
    async (query: string, cursor: string | null = null) => {
      const params = new URLSearchParams(query);
      params.set("limit", "20");
      if (cursor) params.set("cursor", cursor);
      return notificationPageSchema.parse(await get(`/api/notifications?${params}`));
    },
    [get],
  );
  const refresh = useCallback(
    async (target: FilterId = filterRef.current) => {
      setFailure(null);
      try {
        const query = FILTERS.find((f) => f.id === target)!.query;
        const [summaryBody, pinnedPage, page] = await Promise.all([
          get("/api/notifications?view=summary"),
          fetchPage("pinned=true"),
          fetchPage(query),
        ]);
        setSummary(notificationSummarySchema.parse(summaryBody));
        setPinned(pinnedPage.items);
        setItems(page.items);
        setNextCursor(page.page.nextCursor);
      } catch (cause) {
        setFailure(toFailure(cause, "No fue posible consultar las alertas."));
      }
    },
    [fetchPage, get],
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
    setPending({ id: notification.id, action });
    setMessage("");
    setActionFailure(null);
    try {
      const body = new FormData();
      body.set("csrfToken", csrfToken);
      // Same key and version on an ambiguous retry: the API replays instead of conflicting.
      const slot = `${notification.id}:${action}:${notification.audit.version}`;
      body.set("key", (keys.current[slot] ??= crypto.randomUUID()));
      body.set("version", String(notification.audit.version));
      const resource = linkable(notification);
      if (resource && (action === "start-attention" || action === "resolve")) {
        body.set("resourceType", resource.type);
        body.set("resourceId", resource.id);
      }
      const response = await request(
        `/api/notifications/${notification.id}/${action}`,
        { method: "POST", body, headers: headers.current },
        "No fue posible actualizar el aviso.",
      );
      const updated = notificationSchema.parse(await response.json());
      // Confirm only once the refreshed lists are on screen, never next to a stale view.
      await refresh();
      if (action !== "read")
        setMessage(`«${updated.title}»: ${statusLabel(updated.status)}. El cambio quedó auditado.`);
    } catch (cause) {
      const classified = toFailure(cause, "No fue posible actualizar el aviso.");
      setActionFailure({ failure: classified, notificationId: notification.id, action });
      // A version conflict means someone else changed it: show the current state, never retry.
      if (classified.kind === "conflict") await refresh();
    } finally {
      setBusy(false);
      setPending(null);
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
      setFailure(toFailure(cause, "No fue posible cargar más alertas."));
    } finally {
      setBusy(false);
    }
  }
  // Under "Todas" the pinned alerts are already listed above.
  const visible = items.filter((notification) => !(filter === "all" && notification.pinned));
  // A recoverable failure is explained on its card; if the card left the view, on the page.
  const cardFailure =
    actionFailure &&
    inCard(actionFailure.failure) &&
    [...pinned, ...visible].some((n) => n.id === actionFailure.notificationId)
      ? actionFailure
      : null;
  const card = (notification: Notification, key: string) => (
    <Card
      key={key}
      notification={notification}
      busy={busy}
      pending={pending?.id === notification.id ? pending.action : null}
      online={online}
      failure={cardFailure?.notificationId === notification.id ? cardFailure : null}
      onAction={(n, a) => void act(n, a)}
      onOpen={open}
      onRefresh={() => {
        setActionFailure(null);
        void refresh();
      }}
      open={openId === notification.id}
    />
  );
  function choose(next: FilterId) {
    filterRef.current = next;
    setFilter(next);
    void refresh(next);
  }

  if (initialFailure?.kind === "forbidden" || initialFailure?.kind === "session")
    return (
      <main id="main-content" className="alert-layout">
        <header>
          <p className="eyebrow">Avisos y alertas</p>
          <h1>Centro de alertas</h1>
        </header>
        <ServiceState kind={initialFailure.kind} message={initialFailure.message} />
      </main>
    );
  return (
    <main id="main-content" className="alert-layout">
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
      {failure && (
        <ServiceState
          kind={failure.kind}
          message={failure.message}
          onRetry={
            failure.kind === "forbidden" || failure.kind === "session"
              ? undefined
              : () => void refresh()
          }
          retryLabel="Reintentar consulta"
        />
      )}
      {actionFailure && !cardFailure && (
        <ServiceState
          kind={actionFailure.failure.kind}
          message={actionFailure.failure.message}
          onRetry={
            actionFailure.failure.kind === "offline" || actionFailure.failure.kind === "conflict"
              ? () => void refresh()
              : undefined
          }
          retryLabel="Actualizar vista"
        />
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
            {pinned.map((notification) => card(notification, `pinned-${notification.id}`))}
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
          <ServiceState
            kind="empty"
            title={
              filter === "all"
                ? pinned.length > 0
                  ? "No hay otras alertas."
                  : "No tienes alertas pendientes."
                : "No hay alertas que coincidan con este filtro."
            }
            message={
              filter === "all"
                ? "Las alertas nuevas aparecerán aquí; las críticas quedan fijadas hasta «Enterado»."
                : "Elige «Todas» o «Resueltas» para revisar el historial."
            }
          />
        ) : (
          <ul className="alert-list">
            {visible.map((notification) => card(notification, notification.id))}
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
