"use client";
import {
  Button,
  ButtonLink,
  ListLayout,
  Select,
  StatusTag,
  SystemState,
  Table,
  type TableColumn,
  type SystemStateKind,
} from "@ice24/ui";
import type { ScheduledActivity, MaintenanceQuery } from "@ice24/contracts";
import { MaintenanceCalendar } from "./maintenance-calendar";
import { MaintenanceMachineLink } from "./machine-link";
import { MaintenanceNavigation } from "./maintenance-navigation";
import {
  MAINTENANCE_LABELS,
  maintenanceTone as tone,
  assignableActivity,
} from "./maintenance-status";
export { MAINTENANCE_LABELS } from "./maintenance-status";
import { useAccountAccess } from "../account-shell/access-provider";

const date = (row: ScheduledActivity) =>
  row.dueAt
    ? new Intl.DateTimeFormat("es-MX", { timeZone: row.timezone, dateStyle: "medium" }).format(
        new Date(row.dueAt),
      )
    : "Por uso o condición";
const columns = (canReadMachines: boolean): readonly TableColumn<ScheduledActivity>[] => [
  {
    id: "machine",
    header: "Máquina",
    cell: (r) => <MaintenanceMachineLink item={r} canRead={canReadMachines} />,
    mobile: "title",
  },
  { id: "activity", header: "Actividad", cell: (r) => r.name },
  { id: "branch", header: "Sucursal", cell: (r) => r.branchName },
  { id: "date", header: "Vencimiento local", cell: date },
  {
    id: "status",
    header: "Estado",
    cell: (r) => <StatusTag tone={tone(r.state)}>{MAINTENANCE_LABELS[r.state]}</StatusTag>,
  },
  { id: "assignee", header: "Responsable", cell: (r) => r.assigneeId ?? "Sin asignar" },
];

export interface ScheduledScreenProps {
  today: string;
  canAssign?: boolean;
  canReadMachines?: boolean;
  machineOptions?: readonly { value: string; label: string }[];
  branchOptions?: readonly { value: string; label: string }[];
  items: readonly ScheduledActivity[];
  filters: MaintenanceQuery;
  calendar: boolean;
  nextCursor: string | null;
  failure?: SystemStateKind | undefined;
  readOnly?: boolean;
}
export function ScheduledScreen({
  items,
  filters,
  calendar,
  nextCursor,
  failure,
  readOnly,
  machineOptions,
  branchOptions,
  canAssign,
  canReadMachines = false,
  today,
}: ScheduledScreenProps) {
  const { online } = useAccountAccess();
  if (!online) failure = "offline";
  const query = new URLSearchParams(
    Object.entries(filters).map(([key, value]) => [key, String(value)]),
  );
  query.delete("cursor");
  const href = (view: string) => `/maintenance?${query}&view=${view}`;
  return (
    <main id="main-content" className="private-shell maintenance-screen">
      <ListLayout
        title={calendar ? "Calendario de mantenimiento" : "Actividades programadas"}
        eyebrow="Mantenimiento"
        description="Consulta las fechas locales de cada sucursal. Los atrasos permanecen visibles aunque cambie la programación."
        actions={
          <MaintenanceNavigation
            current={calendar ? "calendar" : "list"}
            calendarHref={href("calendar")}
            listHref={href("list")}
          />
        }
        filters={
          <form action="/maintenance" method="get" className="maintenance-filters">
            <input type="hidden" name="view" value={calendar ? "calendar" : "list"} />
            <Select
              label="Estado"
              name="state"
              defaultValue={filters.state ?? ""}
              options={[
                { value: "", label: "Todos los estados" },
                ...Object.entries(MAINTENANCE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <Select
              label="Máquina"
              name="machineId"
              defaultValue={filters.machineId ?? ""}
              options={[
                { value: "", label: "Todas las máquinas" },
                ...(machineOptions ?? [
                  ...new Map(
                    items.map((r) => [r.machineId, { value: r.machineId, label: r.machineCode }]),
                  ).values(),
                ]),
              ]}
            />
            <Select
              label="Sucursal"
              name="branchId"
              defaultValue={filters.branchId ?? ""}
              options={[
                { value: "", label: "Todas las sucursales" },
                ...(branchOptions ?? [
                  ...new Map(
                    items.map((r) => [r.branchId, { value: r.branchId, label: r.branchName }]),
                  ).values(),
                ]),
              ]}
            />
            <Select
              label="Responsable"
              name="assigneeId"
              defaultValue={filters.assigneeId ?? ""}
              options={[
                { value: "", label: "Todos" },
                { value: "unassigned", label: "Sin asignar" },
                ...[...new Set(items.flatMap((r) => (r.assigneeId ? [r.assigneeId] : [])))].map(
                  (value) => ({ value, label: value }),
                ),
              ]}
            />
            <Select
              label="Periodo"
              name="period"
              defaultValue={filters.period ?? ""}
              options={[
                { value: "", label: "Todas las fechas" },
                { value: "next7days", label: "Próximos 7 días" },
              ]}
            />
            <div className="maintenance-filters__actions">
              <Button type="submit" variant="secondary" icon="filter">
                Aplicar filtros
              </Button>
              <ButtonLink
                variant="tertiary"
                icon="close"
                href={`/maintenance?view=${calendar ? "calendar" : "list"}`}
              >
                Limpiar filtros
              </ButtonLink>
            </div>
          </form>
        }
      >
        <p className="maintenance-summary">
          {items.length} actividades en esta página ·{" "}
          {items.filter((item) => item.state === "critical" || item.state === "overdue").length}{" "}
          requieren atención. Los atrasos se conservan al cambiar de periodo.
        </p>
        {readOnly && <SystemState kind="read_only" />}
        {failure ? (
          <SystemState
            kind={failure}
            action={
              <ButtonLink
                variant="secondary"
                icon="refresh"
                href={href(calendar ? "calendar" : "list")}
              >
                Actualizar
              </ButtonLink>
            }
          />
        ) : !items.length ? (
          <SystemState
            kind="empty"
            message="No hay actividades con estos filtros en tu contexto."
          />
        ) : calendar ? (
          <MaintenanceCalendar
            items={items}
            today={today}
            canAssign={Boolean(canAssign && !readOnly && online)}
            canReadMachines={canReadMachines}
            partial={Boolean(nextCursor)}
          />
        ) : (
          <Table
            columns={
              canAssign
                ? [
                    ...columns(canReadMachines),
                    {
                      id: "assign",
                      header: "Orden",
                      cell: (r: ScheduledActivity) =>
                        assignableActivity(r.state) && !r.assigneeId && !readOnly ? (
                          <ButtonLink
                            variant="secondary"
                            icon="user-plus"
                            href={`/maintenance/work-orders/new?sourceType=activity&sourceId=${r.id}`}
                          >
                            Asignar técnico
                          </ButtonLink>
                        ) : (
                          <span>{r.assigneeId ? "Asignada" : "Sin acciones pendientes"}</span>
                        ),
                    },
                  ]
                : columns(canReadMachines)
            }
            rows={items}
            getRowId={(r) => r.id}
            caption="Actividades de mantenimiento del contexto activo"
          />
        )}
        {nextCursor && (
          <ButtonLink
            variant="secondary"
            icon="chevron-right"
            href={`${href(calendar ? "calendar" : "list")}&cursor=${nextCursor}`}
          >
            Siguiente página
          </ButtonLink>
        )}
      </ListLayout>
    </main>
  );
}
