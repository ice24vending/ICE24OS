"use client";
import {
  Button,
  ButtonLink,
  Card,
  ListLayout,
  Select,
  StatusTag,
  SystemState,
  Table,
  type TableColumn,
  type SystemStateKind,
} from "@ice24/ui";
import type { ScheduledActivity, MaintenanceQuery, MaintenanceState } from "@ice24/contracts";
import { useAccountAccess } from "../account-shell/access-provider";

export const MAINTENANCE_LABELS: Record<MaintenanceState, string> = {
  scheduled: "Programada",
  upcoming: "Próxima",
  overdue: "Vencida",
  critical: "Crítica",
  in_progress: "En atención",
  completed: "Completada",
  cancelled: "Cancelada",
};
const tone = (state: MaintenanceState) =>
  state === "critical"
    ? "danger"
    : state === "overdue"
      ? "warning"
      : state === "completed"
        ? "success"
        : "info";
const date = (row: ScheduledActivity) =>
  row.dueAt
    ? new Intl.DateTimeFormat("es-MX", { timeZone: row.timezone, dateStyle: "medium" }).format(
        new Date(row.dueAt),
      )
    : "Por uso o condición";
const columns: readonly TableColumn<ScheduledActivity>[] = [
  {
    id: "machine",
    header: "Máquina",
    cell: (r) => `${r.machineCode} · ${r.machineName}`,
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
}: ScheduledScreenProps) {
  const { online } = useAccountAccess();
  if (!online) failure = "offline";
  const query = new URLSearchParams(
    Object.entries(filters).map(([key, value]) => [key, String(value)]),
  );
  query.delete("cursor");
  const href = (view: string) => `/maintenance?${query}&view=${view}`;
  const groups = new Map<string, ScheduledActivity[]>();
  for (const item of [...items].sort((a, b) => (a.dueAt ?? "z").localeCompare(b.dueAt ?? "z"))) {
    const key = date(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return (
    <main id="main-content" className="private-shell">
      <ListLayout
        title={calendar ? "Calendario de mantenimiento" : "Actividades programadas"}
        eyebrow={calendar ? "UI-MNT-01" : "UI-MNT-02"}
        description="Consulta las fechas locales de cada sucursal. Los atrasos permanecen visibles aunque cambie la programación."
        actions={
          <>
            <ButtonLink href={href("calendar")}>Calendario</ButtonLink>
            <ButtonLink href={href("list")}>Lista</ButtonLink>
          </>
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
                { value: "", label: "Todas las fechas, incluidos atrasos" },
                { value: "next7days", label: "Próximos 7 días" },
              ]}
            />
            <Button type="submit">Aplicar filtros</Button>{" "}
            <ButtonLink href="/maintenance?view=list">Limpiar filtros</ButtonLink>
          </form>
        }
      >
        <p>
          Regla provisional F7-D05: Próxima desde la ventana de aviso (7 días si no está definida).
          Crítica: vencida con criticidad crítica en su plantilla.
        </p>
        {readOnly && <SystemState kind="read_only" />}
        {failure ? (
          <SystemState
            kind={failure}
            action={<ButtonLink href={href(calendar ? "calendar" : "list")}>Actualizar</ButtonLink>}
          />
        ) : !items.length ? (
          <SystemState
            kind="empty"
            message="No hay actividades con estos filtros en tu contexto."
          />
        ) : calendar ? (
          <section aria-label="Calendario por fecha local">
            {[...groups].map(([day, rows]) => (
              <Card key={day} title={day}>
                {rows.map((r) => (
                  <p key={r.id}>
                    <StatusTag tone={tone(r.state)}>{MAINTENANCE_LABELS[r.state]}</StatusTag>{" "}
                    {r.machineCode} · {r.name} · {r.branchName} ({r.timezone})
                  </p>
                ))}
              </Card>
            ))}
          </section>
        ) : (
          <Table
            columns={columns}
            rows={items}
            getRowId={(r) => r.id}
            caption="Actividades de mantenimiento del contexto activo"
          />
        )}
        {nextCursor && (
          <ButtonLink href={`${href(calendar ? "calendar" : "list")}&cursor=${nextCursor}`}>
            Siguiente página
          </ButtonLink>
        )}
      </ListLayout>
    </main>
  );
}
