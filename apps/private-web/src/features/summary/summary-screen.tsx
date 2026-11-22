"use client";
import { LiveRegion } from "@ice24/ui";
import { useCallback, useState, useSyncExternalStore } from "react";
import { type Notification } from "@ice24/contracts";
import {
  ButtonLink,
  Card,
  DashboardLayout,
  PageWidth,
  OperationalChart,
  EmptyState,
  OPERATIONAL_STATES,
  StatusTag,
  Table,
  type KpiCardProps,
  type OperationalStatus,
  type TableColumn,
} from "@ice24/ui";

import { useAccountAccess } from "../account-shell/access-provider";
import { AlertCard, useAlertActions } from "../notifications/center";
import { request, toFailure, type Failure } from "../../components/system-state/failure";
import { ServiceState } from "../../components/system-state/service-state";
import type { MaintenanceTask } from "./maintenance-tasks";
import type { SummaryMachine } from "./machines";
import {
  type loadOperationalSummary,
  operationalCounts,
  summaryDay,
  unacknowledgedAlerts,
  readSummaryList,
  parseSummaryAlerts,
} from "./load-operational-summary";
const subscribeReady = () => () => undefined;
const clientReady = () => true;
const serverReady = () => false;

/** Rows of the quick view; the full list lives in «Máquinas». */
const QUICK_VIEW_ROWS = 5;

const operational = (status: string): OperationalStatus | null =>
  status in OPERATIONAL_STATES ? (status as OperationalStatus) : null;

const COLUMNS: readonly TableColumn<SummaryMachine>[] = [
  { id: "code", header: "Folio", cell: (m) => m.code, mono: true, mobile: "title" },
  { id: "name", header: "Máquina", cell: (m) => m.name },
  { id: "branch", header: "Sucursal", cell: (m) => m.branch },
  {
    id: "state",
    header: "Estado",
    // shortcut: operation only until TASK-F13-03/F13-04 bring technical and sanitary states per
    // machine — switch back to MachineTriad then, instead of two «Sin datos» chips per row.
    cell: (m) => {
      const status = operational(m.status);
      const look = status && OPERATIONAL_STATES[status];
      return (
        <StatusTag tone={look?.tone ?? "nodata"} icon="machine">
          {look?.label ?? "Sin datos"}
        </StatusTag>
      );
    },
  },
];

export interface SummaryScreenProps {
  readonly data: Awaited<ReturnType<typeof loadOperationalSummary>>;
  readonly now: number;
  readonly maintenanceDisabled?: boolean;
  readonly tasksHref?: string;
  readonly contextId: string;
  readonly csrfToken: string;
}
const PRIORITIES: Record<string, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  critical: "Crítica",
};
const TASK_COLUMNS: readonly TableColumn<MaintenanceTask>[] = [
  {
    id: "activity",
    header: "Actividad",
    mobile: "title",
    cell: (t) => (
      <a href={t.href}>
        {t.label}
        <span className="ids-visually-hidden">, {t.machine}</span>
      </a>
    ),
  },
  { id: "machine", header: "Máquina", cell: (t) => t.machine },
  { id: "branch", header: "Sucursal", cell: (t) => t.branch },
  {
    id: "priority",
    header: "Prioridad",
    cell: (t) => (
      <StatusTag
        tone={t.priority === "critical" ? "danger" : t.priority === "high" ? "warning" : "info"}
      >
        {t.priority === "medium" ? "Media" : (PRIORITIES[t.priority ?? ""] ?? "Sin prioridad")}
      </StatusTag>
    ),
  },
  {
    id: "date",
    header: "Fecha",
    cell: (t) =>
      t.dueAt
        ? new Intl.DateTimeFormat("es-MX", {
            dateStyle: "medium",
            timeZone: "America/Mexico_City",
          }).format(new Date(t.dueAt))
        : "Sin fecha",
  },
];
export function SummaryScreen({
  data,
  now,
  maintenanceDisabled = false,
  tasksHref = "/maintenance?view=list",
  contextId,
  csrfToken,
}: SummaryScreenProps) {
  const { online } = useAccountAccess();
  const hydrated = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const { machines, tasks: maintenanceTasks } = data;
  const maintenanceAllowed = !data.activities.denied;
  const alertsAllowed = !data.alerts.denied;
  const [alerts, setAlerts] = useState<readonly Notification[] | null>(data.alerts.data);
  const pinned = alerts?.filter((n) => n.pinned).slice(0, 3) ?? null;
  const [alertFailure, setAlertFailure] = useState<Failure | null>(null),
    [message, setMessage] = useState(""),
    [openId, setOpenId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const get = async (path: string): Promise<unknown> =>
      (
        await request(
          path,
          { cache: "no-store", headers: { "x-ice24-workspace-context": contextId } },
          "No fue posible consultar las alertas.",
        )
      ).json();
    try {
      const result = await readSummaryList(
        async (path) => Response.json(await get(path)),
        "/api/notifications",
        parseSummaryAlerts,
      );
      setAlerts(result.data);
      if (result.data === null) throw new Error("No fue posible consultar las alertas.");
      setAlertFailure(null);
    } catch (cause) {
      setAlerts(null);
      setAlertFailure(toFailure(cause, "No fue posible consultar las alertas."));
    }
  }, [contextId]);

  const { act, pending, busy, actionFailure, setActionFailure } = useAlertActions({
    contextId,
    csrfToken,
    refresh,
    onStart: () => setMessage(""),
    onDone: (updated) => setMessage(`«${updated.title}»: el cambio quedó auditado.`),
  });

  const total = machines?.length ?? 0;
  const available = machines?.filter((m) => m.status === "available").length ?? 0;
  const branches = new Set(machines?.map((m) => m.branch)).size;

  const counts = operationalCounts(
    machines,
    data.tickets.data,
    data.activities.data,
    data.orders.data,
    now,
  );
  const kpis: KpiCardProps[] = [
    {
      label: "Máquinas disponibles",
      href: "/machines",
      value: machines ? counts.available : null,
      period: "Ahora",
      context: machines ? `de ${total} en tu contexto` : undefined,
      icon: "machine",
      tone: "success",
    },
    ...(alertsAllowed
      ? [
          {
            label: "Alertas sin enterado",
            href: "/notifications",
            value: alerts ? unacknowledgedAlerts(alerts) : null,
            period: "Ahora",
            context: "Alta y Crítica",
            icon: "danger",
            tone: "danger",
          } satisfies KpiCardProps,
        ]
      : []),
    ...(!data.tickets.denied
      ? [
          {
            label: "Tickets abiertos hoy",
            href: "/maintenance/tickets",
            value: counts.openToday,
            period: "Hoy",
            context: "Pendientes y en atención",
            icon: "tool",
            tone: "warning",
          } satisfies KpiCardProps,
        ]
      : []),
    ...(maintenanceAllowed
      ? [
          {
            label: "Mantenimientos",
            href: "/maintenance?view=list",
            value:
              counts.next && counts.overdue ? (
                <>
                  <span>{counts.overdue.length} vencidos</span>
                  <span>{counts.next.length} próximos</span>
                </>
              ) : null,
            period: "Próximos 7 días",
            icon: "calendar",
            tone: "info",
            className: "summary-maintenance-kpi",
          } satisfies KpiCardProps,
        ]
      : []),
  ];
  const dayLabels = Array.from({ length: 8 }, (_, i) => summaryDay(now + i * 86400000));
  const ticketItems = counts.today
    ? [
        ...(
          [
            ["pending_assignment", "Pendiente de asignación"],
            ["in_progress", "En atención"],
            ["completed", "Resuelto"],
            ["cancelled", "Cancelado"],
          ] as const
        ).map(([state, label]) => ({
          label: `Estado: ${label}`,
          value: counts.today!.filter((t) => t.state === state).length,
        })),
        ...Object.entries(PRIORITIES).map(([priority, label]) => ({
          label: `Prioridad: ${label}`,
          value: counts.today!.filter((t) => t.priority === priority).length,
        })),
      ]
    : null;
  const failureSource = [
    data.machineSource,
    data.branchSource,
    data.alerts,
    data.tickets,
    data.activities,
    data.orders,
  ].find((source) => source.data === null && !source.denied);

  const cardFailure =
    actionFailure &&
    (actionFailure.failure.kind === "conflict" || actionFailure.failure.kind === "error") &&
    pinned?.some((n) => n.id === actionFailure.notificationId)
      ? actionFailure
      : null;

  return (
    <PageWidth
      as="main"
      id="main-content"
      data-page-ready={String(hydrated)}
      className="summary-screen"
    >
      <DashboardLayout
        title="Resumen"
        description="El estado de tu operación, en un solo lugar."
        kpis={kpis}
      >
        {failureSource && (
          <div className="summary-screen__notice">
            <ServiceState
              kind={online ? "error" : "offline"}
              message="No fue posible consultar todos los datos del resumen."
              correlationId={failureSource.correlationId}
            />
          </div>
        )}
        {alertsAllowed && (
          <>
            <LiveRegion role="status" className="alert-message" data-announcement="summary-action">
              {message}
            </LiveRegion>
            {alertFailure && (
              <ServiceState
                kind={alertFailure.kind}
                message={alertFailure.message}
                onRetry={() => void refresh()}
                retryLabel="Reintentar consulta"
              />
            )}
            {actionFailure && !cardFailure && (
              <ServiceState
                kind={actionFailure.failure.kind}
                message={actionFailure.failure.message}
                onRetry={() => {
                  setActionFailure(null);
                  void refresh();
                }}
                retryLabel="Actualizar vista"
              />
            )}
            {pinned && pinned.length > 0 && (
              <section aria-labelledby="summary-pinned" className="alert-section">
                <h2 id="summary-pinned" className="ids-visually-hidden">
                  Alertas críticas sin enterado
                </h2>
                <ul className="alert-list">
                  {pinned.map((notification) => (
                    <AlertCard
                      key={notification.id}
                      notification={notification}
                      busy={busy}
                      pending={pending?.id === notification.id ? pending.action : null}
                      online={online}
                      failure={cardFailure?.notificationId === notification.id ? cardFailure : null}
                      onAction={(n, a) => void act(n, a)}
                      onOpen={(n) => {
                        const opening = openId !== n.id;
                        setOpenId(opening ? n.id : null);
                        // Opening an alert marks it read, never acknowledged (UI/UX 26.2).
                        if (opening && n.status === "unread") void act(n, "read");
                      }}
                      onRefresh={() => {
                        setActionFailure(null);
                        void refresh();
                      }}
                      open={openId === notification.id}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
        <div className="summary-screen__charts" role="region" aria-label="Tablero operativo">
          <OperationalChart
            title="Estado operativo de máquinas"
            variant="stacked"
            summary={
              machines
                ? `${total - available} de ${total} máquinas necesitan atención`
                : "No fue posible consultar las máquinas"
            }
            items={
              machines
                ? Object.entries(OPERATIONAL_STATES)
                    .filter(
                      ([state]) =>
                        ["available", "maintenance", "out_of_service"].includes(state) ||
                        machines.some((m) => m.status === state),
                    )
                    .map(([state, look]) => ({
                      label: look.label,
                      value: machines.filter((m) => m.status === state).length,
                      tone: look.tone,
                    }))
                : null
            }
          />
          {!data.tickets.denied && (
            <OperationalChart
              title="Tickets de hoy por estado y prioridad"
              summary={
                counts.today
                  ? `${counts.openToday} abiertos de ${counts.today.length} reportados hoy`
                  : "No fue posible consultar los tickets"
              }
              items={ticketItems}
            />
          )}
          {maintenanceAllowed && (
            <OperationalChart
              title="Mantenimientos de los próximos 7 días"
              variant="columns"
              summary={
                counts.next && counts.overdue
                  ? `${counts.next.length} próximos y ${counts.overdue.length} vencidos por atender`
                  : "No fue posible consultar los mantenimientos"
              }
              items={
                counts.next && counts.overdue
                  ? [
                      {
                        label: "Vencidos",
                        value: counts.overdue.length,
                        tone: "danger",
                        highlighted: true,
                      },
                      ...dayLabels.map((day) => ({
                        label: new Intl.DateTimeFormat("es-MX", {
                          day: "numeric",
                          month: "short",
                          timeZone: "America/Mexico_City",
                        }).format(new Date(day + "T12:00:00Z")),
                        value: counts.next!.filter((a) => a.dueAt && summaryDay(a.dueAt) === day)
                          .length,
                      })),
                    ]
                  : null
              }
            />
          )}
          {!data.orders.denied && (
            <OperationalChart
              title="Órdenes por responsable"
              summary={
                counts.activeOrders === null
                  ? "No fue posible consultar las órdenes"
                  : `${counts.activeOrders} órdenes activas; hasta 5 responsables con más pendientes`
              }
              items={counts.assignees}
            />
          )}
        </div>
        <Card title="Tareas por atender" titleAs="h2" icon="tool" className="summary-screen__tasks">
          {maintenanceDisabled ? (
            <EmptyState
              title="Mantenimiento deshabilitado"
              description="Las órdenes y actividades de mantenimiento aparecerán aquí cuando se active ese módulo."
            />
          ) : !maintenanceAllowed ? (
            <EmptyState
              title="Tareas no disponibles en este contexto"
              description="Revisa el contexto y tus permisos de consulta."
            />
          ) : maintenanceTasks === null ? (
            <ServiceState
              kind="error"
              message="No fue posible consultar las tareas de mantenimiento."
            />
          ) : !maintenanceTasks.length ? (
            <EmptyState
              title="No hay tareas por atender"
              description="No hay órdenes ni actividades pendientes en tu contexto."
            />
          ) : (
            <>
              <Table
                caption="Tareas por atender"
                captionHidden
                columns={TASK_COLUMNS}
                rows={maintenanceTasks}
                getRowId={(t) => t.id}
                getRowLabel={(t) => t.label}
              />
              <ButtonLink icon="list" variant="tertiary" href={tasksHref}>
                Ver todas las tareas
              </ButtonLink>
            </>
          )}
        </Card>
        <Card
          title="Vista rápida de máquinas"
          titleAs="h2"
          icon="machine"
          padding="flush"
          className="summary-screen__machines"
          actions={
            <ButtonLink icon="list" href="/machines" variant="tertiary" size="sm">
              Ver todas
            </ButtonLink>
          }
          footer={
            machines && machines.length > 0
              ? `Mostrando ${Math.min(QUICK_VIEW_ROWS, total)} de ${total} · ${branches} ${branches === 1 ? "sucursal" : "sucursales"}`
              : undefined
          }
        >
          {machines === null ? (
            <ServiceState
              kind="error"
              message="No fue posible cargar las máquinas. Recarga la página para intentar de nuevo."
            />
          ) : (
            <Table
              caption="Vista rápida de máquinas"
              captionHidden
              columns={COLUMNS}
              rows={machines.slice(0, QUICK_VIEW_ROWS)}
              getRowId={(m) => m.id}
              getRowLabel={(m) => m.code}
              empty={
                <EmptyState
                  title="Tu cuenta todavía no tiene máquinas."
                  description="Cuando ICE24 dé de alta tus máquinas aparecerán aquí."
                />
              }
            />
          )}
        </Card>
      </DashboardLayout>
    </PageWidth>
  );
}
