"use client";
import { useId, useState, type ReactNode } from "react";
import {
  StatusTag,
  Table,
  ViewSwitcher,
  type CollectionView,
  type StatusTone,
  type TableColumn,
  type TableSort,
} from "@ice24/ui";
import type { WorkOrder } from "@ice24/contracts";
import { useViewPreference } from "../navigation/use-view-preference";

export const ORDER_LABELS = {
  scheduled: "Programado",
  upcoming: "Próximo",
  overdue: "Vencido",
  in_progress: "En atención",
  completed: "Completado",
  with_observations: "Con observaciones",
  nonconforming: "No conforme",
  corrected: "Corregido",
  cancelled: "Anulado",
};
/** Attention order shared by the table groups and the board columns. */
export const ORDER_GROUPS = [
  "Críticas",
  "Vencidas",
  "Próximas",
  "Programadas",
  "En atención",
  "En revisión y cerradas",
] as const;
const CLOSED_GROUP = ORDER_GROUPS.length - 1;
const OPEN_GROUP: Partial<Record<WorkOrder["state"], number>> = {
  overdue: 1,
  upcoming: 2,
  scheduled: 3,
  in_progress: 4,
};
const PRIORITY: Record<string, { label: string; tone: StatusTone; rank: number }> = {
  critical: { label: "Crítica", tone: "danger", rank: 0 },
  high: { label: "Alta", tone: "warning", rank: 1 },
  medium: { label: "Media", tone: "info", rank: 2 },
  low: { label: "Baja", tone: "info", rank: 3 },
};
const criticality = (order: WorkOrder) =>
  "criticality" in order.definition ? order.definition.criticality : undefined;

/** Only open orders whose activity is critical go first; the API has no order priority. */
export function orderGroup(order: WorkOrder) {
  const open = OPEN_GROUP[order.state];
  if (open === undefined) return CLOSED_GROUP;
  return criticality(order) === "critical" ? 0 : open;
}
export const byAttention = (a: WorkOrder, b: WorkOrder) =>
  orderGroup(a) - orderGroup(b) ||
  (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") ||
  a.folio.localeCompare(b.folio, "es-MX", { numeric: true });

const dueDate = (order: WorkOrder) =>
  order.dueAt
    ? new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeZone: "America/Mexico_City",
      }).format(new Date(order.dueAt))
    : "Sin fecha";
const stateTag = (order: WorkOrder) => (
  <StatusTag
    tone={order.state === "overdue" || order.state === "nonconforming" ? "warning" : "info"}
  >
    {ORDER_LABELS[order.state]}
  </StatusTag>
);
function PriorityTag({ order }: { order: WorkOrder }) {
  const priority = PRIORITY[criticality(order) ?? ""];
  return priority ? (
    <StatusTag tone={priority.tone}>{priority.label}</StatusTag>
  ) : (
    <span>Sin prioridad</span>
  );
}
const columns: readonly TableColumn<WorkOrder>[] = [
  {
    id: "folio",
    header: "Folio",
    cell: (o) => o.folio,
    sortValue: (o) => o.folio,
    mono: true,
    mobile: "title",
  },
  { id: "machine", header: "Máquina", cell: (o) => o.machineCode, sortValue: (o) => o.machineCode },
  {
    id: "activity",
    header: "Actividad",
    cell: (o) => o.definition.name,
    sortValue: (o) => o.definition.name,
  },
  {
    id: "state",
    header: "Estado",
    cell: stateTag,
    sortValue: (o) => ORDER_LABELS[o.state],
  },
  { id: "due", header: "Fecha límite", cell: dueDate, sortValue: (o) => o.dueAt },
  {
    id: "assignee",
    header: "Responsable",
    cell: (o) => o.assigneeName,
    sortValue: (o) => o.assigneeName,
  },
  {
    id: "priority",
    header: "Prioridad",
    cell: (o) => <PriorityTag order={o} />,
    sortValue: (o) => PRIORITY[criticality(o) ?? ""]?.rank,
    priority: "low",
  },
];
const countLabel = (count: number) => (count === 1 ? "1 orden" : `${count} órdenes`);

interface CollectionProps {
  items: readonly WorkOrder[];
  actions: (order: WorkOrder) => ReactNode;
}
/** Keeps the choice in `?vista=` (URL wins over storage), like the other list screens. */
export function RoutedWorkOrdersCollection(props: CollectionProps) {
  const { view, changeView } = useViewPreference("work-orders");
  return <WorkOrdersCollection {...props} view={view} onViewChange={changeView} />;
}
/** Items arrive sorted with `byAttention`; both views keep the same groups and order. */
export function WorkOrdersCollection({
  items,
  actions,
  view,
  onViewChange,
}: CollectionProps & { view: CollectionView; onViewChange: (view: CollectionView) => void }) {
  const id = useId();
  const [sort, setSort] = useState<TableSort>({ columnId: "due", direction: "ascending" });
  const [showClosed, setShowClosed] = useState(false);
  const groups = ORDER_GROUPS.map((label, index) => ({
    label,
    index,
    orders: items.filter((order) => orderGroup(order) === index),
  }));
  return (
    <>
      <ViewSwitcher
        value={view}
        onChange={onViewChange}
        label="Vista de órdenes"
        labels={{ lista: "Lista", bloques: "Tablero" }}
      />
      {view === "lista" ? (
        groups
          .filter((group) => group.orders.length)
          .map((group) => (
            <section
              key={group.label}
              className="work-order-group"
              aria-labelledby={`${id}-group-${group.index}`}
            >
              <h2 id={`${id}-group-${group.index}`}>
                {group.label} <span>· {countLabel(group.orders.length)}</span>
              </h2>
              <Table
                caption={`${group.label}: ${countLabel(group.orders.length)}`}
                captionHidden
                columns={columns}
                rows={group.orders}
                getRowId={(order) => order.id}
                getRowLabel={(order) => order.folio}
                getRowHref={(order) => `/maintenance/work-orders/${order.id}`}
                sort={sort}
                onSortChange={setSort}
                rowActions={actions}
              />
            </section>
          ))
      ) : (
        <ul className="work-order-board" aria-label="Tablero de órdenes">
          {groups.map((group) => {
            const folded = group.index === CLOSED_GROUP && !showClosed;
            const headingId = `${id}-column-${group.index}`;
            const listId = `${id}-cards-${group.index}`;
            return (
              <li key={group.label} className="work-order-board__column">
                <section aria-labelledby={headingId}>
                  <h2 id={headingId}>
                    {group.index === CLOSED_GROUP ? (
                      <button
                        type="button"
                        aria-expanded={!folded}
                        aria-controls={folded ? undefined : listId}
                        onClick={() => setShowClosed((open) => !open)}
                      >
                        {group.label} <span>· {countLabel(group.orders.length)}</span>
                      </button>
                    ) : (
                      <>
                        {group.label} <span>· {countLabel(group.orders.length)}</span>
                      </>
                    )}
                  </h2>
                  {folded ? null : group.orders.length ? (
                    <ul id={listId} className="work-order-board__cards">
                      {group.orders.map((order) => (
                        <li key={order.id} className="work-order-card">
                          <h3>
                            <a href={`/maintenance/work-orders/${order.id}`}>{order.folio}</a>
                          </h3>
                          <p>
                            {order.machineCode} · {order.definition.name}
                          </p>
                          <p>Fecha límite: {dueDate(order)}</p>
                          <p>Responsable: {order.assigneeName}</p>
                          <div className="work-order-card__tags">
                            {stateTag(order)}
                            <PriorityTag order={order} />
                          </div>
                          {actions(order)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p id={listId} className="work-order-board__empty">
                      Sin órdenes
                    </p>
                  )}
                </section>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
