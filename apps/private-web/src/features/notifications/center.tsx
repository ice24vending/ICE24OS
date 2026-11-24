"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import { Button, Icon, KpiCard, LiveRegion } from "@ice24/ui";
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
import { FILTERS, PINNED_FILTER, detailHref, filterHref, filterOf, type FilterId } from "./filters";
import { rowLinkId } from "../navigation/return-focus";
import { useAccountAccess } from "../account-shell/access-provider";
import {
  request,
  toFailure,
  type Failure,
  type FailureKind,
} from "../../components/system-state/failure";
import { ServiceState } from "../../components/system-state/service-state";

/** Status names of the CriticalAlert card (F6-04), reused in the confirmation message. */
const statusLabel = (status: NotificationStatus) => ALERT_STATUSES[status].label;
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

/** Failure of a transition, kept with the alert it belongs to so the card can explain it. */
interface ActionFailure {
  readonly failure: Failure;
  readonly notificationId: string;
  readonly action: NotificationAction;
}
/** Conflicts and plain errors are recoverable inside the card; the rest are page states. */
const inCard = (failure: Failure) => failure.kind === "conflict" || failure.kind === "error";

export function AlertCard({
  notification,
  busy,
  pending,
  online,
  failure,
  onAction,
  onOpen,
  onRefresh,
  open,
  detailLink,
  as = "li",
  titleAs = "h3",
}: {
  notification: Notification;
  busy: boolean;
  pending: NotificationAction | null;
  online: boolean;
  failure: ActionFailure | null;
  onAction: (notification: Notification, action: NotificationAction) => void;
  /** Detail toggle inside the card (Resumen); omitted when the detail has its own route. */
  onOpen?: ((notification: Notification) => void) | undefined;
  onRefresh: () => void;
  open: boolean;
  /** «Ver detalle» as a link to `/notifications/[id]` (UXD-05). */
  detailLink?:
    | {
        href: string;
        id?: string | undefined;
        onOpen?: (event: MouseEvent<HTMLAnchorElement>) => void;
      }
    | undefined;
  as?: "li" | "article" | "div";
  titleAs?: "h2" | "h3" | "h4";
}) {
  const resource = linkable(notification);
  const transition = (action: NotificationAction) => () => onAction(notification, action);
  // "read" (sent when opening the detail) has no button; while it runs every action waits, so
  // no transition leaves with the version from before the read.
  const own = pending === "read" ? null : pending;
  return (
    <CriticalAlert
      as={as}
      titleAs={titleAs}
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
      onToggleDetail={onOpen && (() => onOpen(notification))}
      detailHref={detailLink?.href}
      detailLinkId={detailLink?.id}
      onOpenDetail={detailLink?.onOpen}
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

/**
 * Transitions of an alert (read, acknowledge, attention, resolve) shared by the center and the
 * account summary: same version, idempotency key and conflict handling everywhere.
 */
export function useAlertActions({
  contextId,
  csrfToken,
  refresh,
  onStart,
  onDone,
}: {
  contextId: string;
  csrfToken: string;
  /** Reloads the lists that show the alert; awaited before confirming. */
  refresh: () => Promise<void>;
  onStart?: () => void;
  onDone?: (updated: Notification, action: NotificationAction) => void;
}) {
  const [actionFailure, setActionFailure] = useState<ActionFailure | null>(null),
    [pending, setPending] = useState<{ id: string; action: NotificationAction } | null>(null),
    [busy, setBusy] = useState(false);
  // One key per notification and action: an ambiguous network failure retries with the same key.
  const keys = useRef<Record<string, string>>({});
  const { canWrite } = useAccountAccess();
  async function act(notification: Notification, action: NotificationAction) {
    // A read-only account cannot record the read; opening still shows the alert (UXD-05).
    if (action === "read" && !canWrite) return;
    setBusy(true);
    setPending({ id: notification.id, action });
    onStart?.();
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
        { method: "POST", body, headers: { "x-ice24-workspace-context": contextId } },
        "No fue posible actualizar el aviso.",
      );
      const updated = notificationSchema.parse(await response.json());
      // Confirm only once the refreshed lists are on screen, never next to a stale view.
      await refresh();
      if (action !== "read") onDone?.(updated, action);
    } catch (cause) {
      const classified = toFailure(cause, "No fue posible actualizar el aviso.");
      // The read is implicit (opening the alert): a rejection is not the person's to fix.
      if (action !== "read")
        setActionFailure({ failure: classified, notificationId: notification.id, action });
      // A version conflict means someone else changed it: show the current state, never retry.
      if (classified.kind === "conflict") await refresh();
    } finally {
      setBusy(false);
      setPending(null);
    }
  }
  return { act, pending, busy, setBusy, actionFailure, setActionFailure };
}

/** The detail opens beside the list from 1280 px; below, «Ver detalle» follows its route. */
const WIDE = "(min-width: 80rem)";
const subscribeWide = (notify: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const useWide = () =>
  useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
const noHydrationChanges = () => () => undefined;
/** False while server rendering and hydrating, true once controls can take focus. */
export const useHydrated = () =>
  useSyncExternalStore(
    noHydrationChanges,
    () => true,
    () => false,
  );
/** True when the element that had focus left the page (its button disappeared). */
const focusLost = () => {
  const active = document.activeElement;
  return !active || active === document.body || !active.isConnected;
};

export function NotificationCenter({
  contextId,
  csrfToken,
  initialSummary,
  initialPinned,
  initialPage,
  initialFailure,
  initialFilter = "todas",
}: {
  contextId: string;
  csrfToken: string;
  initialSummary: NotificationSummary | null;
  initialPinned: NotificationPage | null;
  initialPage: NotificationPage | null;
  initialFailure: { kind: FailureKind; message: string; correlationId?: string | undefined } | null;
  initialFilter?: FilterId;
}) {
  const { online } = useAccountAccess();
  const wide = useWide();
  const [summary, setSummary] = useState(initialSummary),
    [pinned, setPinned] = useState(initialPinned?.items ?? []),
    [items, setItems] = useState(initialPage?.items ?? []),
    [nextCursor, setNextCursor] = useState(initialPage?.page.nextCursor ?? null),
    [filter, setFilter] = useState<FilterId>(initialFilter),
    [failure, setFailure] = useState<
      Failure | { kind: FailureKind; message: string; correlationId?: string | undefined } | null
    >(initialFailure),
    [message, setMessage] = useState(""),
    [selectedId, setSelectedId] = useState<string | null>(null),
    // Alert whose transition just finished: focus returns to it if its button disappeared.
    [settled, setSettled] = useState<{ id: string } | null>(null);
  const headers = useRef({ "x-ice24-workspace-context": contextId });
  const filterRef = useRef<FilterId>(initialFilter);
  const panelHeading = useRef<HTMLHeadingElement>(null);
  const focusPanel = useRef(false);
  // UXD-00 contract: «Volver» from a detail restores focus once the links can receive it.
  const hydrated = useHydrated();

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
        const [summaryBody, pinnedPage, page] = await Promise.all([
          get("/api/notifications?view=summary"),
          fetchPage(PINNED_FILTER.query),
          fetchPage(filterOf(target).query),
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

  const { act, pending, busy, setBusy, actionFailure, setActionFailure } = useAlertActions({
    contextId,
    csrfToken,
    refresh,
    onStart: () => setMessage(""),
    onDone: (updated) => {
      setMessage(`«${updated.title}»: ${statusLabel(updated.status)}. El cambio quedó auditado.`);
      setSettled({ id: updated.id });
    },
  });
  useEffect(() => {
    if (!settled || !focusLost()) return;
    // Never the live message itself: it is announced once by its region (SR-05 C6).
    const target =
      wide && selectedId === settled.id
        ? panelHeading.current
        : document.getElementById(rowLinkId(settled.id));
    target?.focus();
  }, [settled, wide, selectedId]);
  useEffect(() => {
    if (!focusPanel.current || !selectedId) return;
    focusPanel.current = false;
    panelHeading.current?.focus();
  }, [selectedId]);

  function openBeside(notification: Notification, event: MouseEvent<HTMLAnchorElement>) {
    // Below 1280 px, and with modifier keys, the link opens the detail route as usual.
    if (!wide || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    focusPanel.current = true;
    setSelectedId(notification.id);
    // Opening an alert marks it read, never acknowledged (UI/UX 26.2); only after a click.
    if (notification.status === "unread") void act(notification, "read");
  }
  async function loadMore() {
    if (!nextCursor) return;
    setBusy(true);
    try {
      const page = await fetchPage(filterOf(filter).query, nextCursor);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.page.nextCursor);
    } catch (cause) {
      setFailure(toFailure(cause, "No fue posible cargar más alertas."));
    } finally {
      setBusy(false);
    }
  }
  const pinnedFilter = filter === PINNED_FILTER.id;
  // Under "Todas" the pinned alerts are already listed above; their own filter lists them once.
  const visible = items.filter((notification) => !(filter === "todas" && notification.pinned));
  const shownPinned = pinnedFilter ? [] : pinned;
  const selected = [...shownPinned, ...visible].find((n) => n.id === selectedId) ?? null;
  // A recoverable failure is explained on its card; if the card left the view, on the page.
  const cardFailure =
    actionFailure &&
    inCard(actionFailure.failure) &&
    [...shownPinned, ...visible].some((n) => n.id === actionFailure.notificationId)
      ? actionFailure
      : null;
  // The first card of each alert carries the link id that «Volver» and focus return use.
  const linked = new Set<string>();
  const card = (notification: Notification, key: string) => {
    const first = !linked.has(notification.id);
    linked.add(notification.id);
    return (
      <AlertCard
        key={key}
        notification={notification}
        busy={busy}
        pending={pending?.id === notification.id ? pending.action : null}
        online={online}
        failure={cardFailure?.notificationId === notification.id ? cardFailure : null}
        onAction={(n, a) => void act(n, a)}
        onRefresh={() => {
          setActionFailure(null);
          void refresh();
        }}
        open={false}
        detailLink={{
          href: detailHref(notification.id, filter),
          id: first ? rowLinkId(notification.id) : undefined,
          onOpen: (event) => openBeside(notification, event),
        }}
      />
    );
  };
  function choose(next: FilterId) {
    filterRef.current = next;
    setFilter(next);
    // Keep the filter in the address so «Volver» from a detail and reloads restore it.
    window.history.replaceState(window.history.state, "", filterHref(next));
    void refresh(next);
  }
  const kpis = summary && (
    <section aria-labelledby="alert-kpis-heading" className="alert-kpis">
      <h2 id="alert-kpis-heading" className="ids-visually-hidden">
        Resumen de avisos
      </h2>
      {(
        [
          [PINNED_FILTER.id, "Críticas sin enterado", summary.pinned, "danger", "danger"],
          ["en-atencion", "En atención", summary.inProgress, "clock", "warning"],
          ["resueltas", "Resueltas", summary.resolved, "check-circle", "success"],
        ] as const
      ).map(([id, label, value, icon, tone]) => (
        <KpiCard
          key={id}
          label={label}
          value={value}
          period="Ahora"
          context={filter === id ? "Filtro activo" : "Ver en la lista"}
          href={filterHref(id)}
          current={filter === id}
          icon={icon}
          tone={tone}
        />
      ))}
    </section>
  );

  if (initialFailure?.kind === "forbidden" || initialFailure?.kind === "session")
    return (
      <main id="main-content" className="alert-layout" data-page-ready={String(hydrated)}>
        <header>
          <p className="eyebrow">Avisos y alertas</p>
          <h1>Centro de alertas</h1>
        </header>
        <ServiceState
          kind={initialFailure.kind}
          message={initialFailure.message}
          correlationId={initialFailure.correlationId}
        />
      </main>
    );
  return (
    <main id="main-content" className="alert-layout" data-page-ready={String(hydrated)}>
      <header>
        <p className="eyebrow">Avisos y alertas</p>
        <h1>Centro de alertas</h1>
        <p className="alert-help">
          «Enterado» confirma que viste la alerta y la desfija, pero no la resuelve. «Resuelta» sólo
          es posible cuando la causa vinculada ya está cerrada. Fechas en UTC.
        </p>
      </header>
      {kpis}
      {failure && (
        <ServiceState
          kind={failure.kind}
          message={failure.message}
          correlationId={failure.correlationId}
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
      <LiveRegion role="status" className="alert-message">
        {message}
      </LiveRegion>
      <div className="alert-workspace">
        <div className="alert-column">
          {shownPinned.length > 0 && (
            <section aria-labelledby="pinned-heading" className="alert-section">
              <h2 id="pinned-heading">Críticas sin enterado</h2>
              <ul className="alert-list">
                {shownPinned.map((notification) => card(notification, `pinned-${notification.id}`))}
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
                  <Icon
                    name={
                      option.id === "criticas"
                        ? "danger"
                        : option.id === "no-enteradas"
                          ? "bell"
                          : option.id === "en-atencion"
                            ? "clock"
                            : option.id === "resueltas"
                              ? "check-circle"
                              : "list"
                    }
                  />{" "}
                  {option.label}
                </button>
              ))}
            </div>
            {pinnedFilter && (
              <p className="alert-active-filter">
                Filtrando: críticas sin enterado ·{" "}
                <Button
                  variant="tertiary"
                  size="sm"
                  disabled={busy}
                  onClick={() => choose("todas")}
                >
                  Quitar filtro
                </Button>
              </p>
            )}
            {visible.length === 0 ? (
              <ServiceState
                kind="empty"
                title={
                  filter === "todas"
                    ? pinned.length > 0
                      ? "No hay otras alertas."
                      : "No tienes alertas pendientes."
                    : "No hay alertas que coincidan con este filtro."
                }
                message={
                  filter === "todas"
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
                <Icon name="refresh" />
                Cargar más alertas
              </button>
            )}
          </section>
        </div>
        {wide && (
          <aside aria-labelledby="alert-panel-heading" className="alert-panel">
            <h2 id="alert-panel-heading" ref={panelHeading} tabIndex={-1}>
              Detalle del aviso
            </h2>
            {selected ? (
              <AlertCard
                notification={selected}
                as="article"
                busy={busy}
                pending={pending?.id === selected.id ? pending.action : null}
                online={online}
                failure={cardFailure?.notificationId === selected.id ? cardFailure : null}
                onAction={(n, a) => void act(n, a)}
                onRefresh={() => {
                  setActionFailure(null);
                  void refresh();
                }}
                open
              />
            ) : (
              <ServiceState
                kind="empty"
                title="Elige un aviso para ver su detalle"
                message="Usa «Ver detalle» en cualquier aviso de la lista."
              />
            )}
          </aside>
        )}
      </div>
    </main>
  );
}
