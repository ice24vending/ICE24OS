"use client";
import { useCallback, useState } from "react";
import {
  notificationPageSchema,
  notificationSummarySchema,
  type Notification,
  type NotificationSummary,
} from "@ice24/contracts";
import {
  ButtonLink,
  Card,
  DashboardLayout,
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
import type { SummaryMachine } from "./machines";

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
    // shortcut: operation only; technical and sanitary states arrive with Fases 7 and 8 — switch
    // back to MachineTriad then, instead of two «Sin datos» chips per row.
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
  readonly contextId: string;
  readonly csrfToken: string;
  /** `null`: the machines could not be read. */
  readonly machines: readonly SummaryMachine[] | null;
  /** False when the role cannot read alerts (403): the section is not drawn. */
  readonly alertsAllowed: boolean;
  readonly initialAlertSummary: NotificationSummary | null;
  readonly initialPinned: readonly Notification[] | null;
}

/**
 * Account summary (approved reference, D-03). Indicators, pinned critical alerts (same
 * transitions as the alert center) and a quick view of the machines. Tasks keep their place and
 * say what enables them; maintenance and sanitary indicators stay out until their modules exist.
 */
export function SummaryScreen({
  contextId,
  csrfToken,
  machines,
  alertsAllowed,
  initialAlertSummary,
  initialPinned,
}: SummaryScreenProps) {
  const { online } = useAccountAccess();
  const [alertSummary, setAlertSummary] = useState(initialAlertSummary),
    [pinned, setPinned] = useState(initialPinned),
    [alertFailure, setAlertFailure] = useState<Failure | null>(null),
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
      const [summaryBody, pinnedBody] = await Promise.all([
        get("/api/notifications?view=summary"),
        get("/api/notifications?pinned=true&limit=3"),
      ]);
      setAlertSummary(notificationSummarySchema.parse(summaryBody));
      setPinned([...notificationPageSchema.parse(pinnedBody).items]);
      setAlertFailure(null);
    } catch (cause) {
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

  const kpis: KpiCardProps[] = [
    {
      label: "Máquinas disponibles",
      value: machines ? available : null,
      period: "Ahora",
      context: machines ? `de ${total} en tu cuenta` : undefined,
      icon: "machine",
      tone: "success",
    },
    ...(alertsAllowed
      ? [
          {
            label: "Alertas críticas",
            value: alertSummary ? alertSummary.pinned : null,
            period: "Ahora",
            context: "sin enterado",
            icon: "danger",
            tone: "danger",
          } satisfies KpiCardProps,
        ]
      : []),
    // Maintenance and sanitary indicators join when Fases 7 and 8 bring their data.
  ];

  const cardFailure =
    actionFailure &&
    (actionFailure.failure.kind === "conflict" || actionFailure.failure.kind === "error") &&
    pinned?.some((n) => n.id === actionFailure.notificationId)
      ? actionFailure
      : null;

  return (
    <main id="main-content" className="private-shell summary-screen">
      <DashboardLayout
        title="Resumen"
        description="El estado de tu operación, en un solo lugar."
        banner={
          alertsAllowed && (
            <>
              {message && (
                <p role="status" className="alert-message">
                  {message}
                </p>
              )}
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
                        failure={
                          cardFailure?.notificationId === notification.id ? cardFailure : null
                        }
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
          )
        }
        kpis={kpis}
      >
        <Card title="Tareas por atender" titleAs="h2" icon="tool" className="summary-screen__tasks">
          <EmptyState
            title="Todavía no hay tareas."
            description="Las órdenes y actividades de mantenimiento aparecerán aquí cuando se active ese módulo."
          />
        </Card>
        <Card
          title="Vista rápida de máquinas"
          titleAs="h2"
          icon="machine"
          padding="flush"
          className="summary-screen__machines"
          actions={
            <ButtonLink href="/machines" variant="tertiary" size="sm">
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
    </main>
  );
}
