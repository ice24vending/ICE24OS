import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { CollectionView } from "@ice24/ui";
import { WorkOrdersScreen } from "./work-orders-screen";
import { WorkOrdersCollection, byAttention } from "./work-orders-collection";
import type { WorkOrder } from "@ice24/contracts";
import { demoOrderDefinition } from "../../server/demo/work-order-fixtures";
import { demoIds, demoUserId } from "../../server/demo/fixtures";
import "../maintenance/tickets.css";
import "../maintenance/maintenance.css";
import "./work-orders.css";
const order: WorkOrder = {
  id: demoIds.job(2000),
  folio: "OT-000001",
  machineId: demoIds.machine(1),
  machineCode: "ICE24-MTY-0001",
  branchId: demoIds.branch(1),
  sourceType: "ticket",
  sourceId: demoIds.request(900),
  ticketId: demoIds.request(900),
  activityId: null,
  assigneeId: demoUserId("technician"),
  assigneeName: "Técnico de demostración",
  templateId: demoIds.template(1),
  templateVersion: 1,
  definition: demoOrderDefinition,
  state: "scheduled",
  dueAt: null,
  alertAt: null,
  rowVersion: 1,
  createdAt: "2026-11-03T16:00:00.000Z",
};
const meta = {
  title: "Mantenimiento/Órdenes de trabajo",
  component: WorkOrdersScreen,
  args: { mode: "list", contextId: "demo", csrfToken: "demo", items: [] },
  argTypes: {
    failure: {
      control: "select",
      options: [undefined, "loading", "empty", "error", "forbidden", "offline", "conflict"],
    },
    readOnly: { control: "boolean" },
  },
} satisfies Meta<typeof WorkOrdersScreen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Asignadas: Story = {};
const states = [
  "scheduled",
  "upcoming",
  "overdue",
  "in_progress",
  "completed",
  "cancelled",
] as const;
const varied = Array.from({ length: 12 }, (_, i) => ({
  ...order,
  id: `order-${i}`,
  folio: `OT-${String(i + 1).padStart(6, "0")}`,
  state: states[i % states.length]!,
  assigneeName: ["Ana Torres", "Luis García", "Marisol Pérez"][i % 3]!,
  dueAt: `2026-11-${String(10 + i).padStart(2, "0")}T18:00:00.000Z`,
  definition: {
    ...demoOrderDefinition,
    criticality: (["critical", "high", "medium", "low"] as const)[i % 4]!,
  },
})).sort(byAttention);
/** The screen keeps the view in the URL (Next router); the catalog shows the same collection. */
function Collection({ initial }: { initial: CollectionView }) {
  const [view, setView] = useState(initial);
  return (
    <main id="main-content" className="private-shell work-orders-screen">
      <WorkOrdersCollection
        items={varied}
        actions={() => null}
        view={view}
        onViewChange={setView}
      />
    </main>
  );
}
export const ListaAgrupada: Story = { render: () => <Collection initial="lista" /> };
export const Tablero: Story = { render: () => <Collection initial="bloques" /> };
export const MatrizDeEstados: Story = { args: { failure: "offline" } };
export const LineaDeEstadosDeLaOrden: Story = {
  args: {
    mode: "detail",
    detail: {
      order,
      canReassign: false,
      actions: [
        { action: "start", allowed: false, message: "Solo el técnico responsable puede iniciar." },
      ],
      events: [
        {
          id: order.id,
          operation: "WorkOrderCreated",
          reason: "Asignación de técnico",
          state: "scheduled",
          occurredAt: order.createdAt,
        },
        {
          id: order.sourceId,
          operation: "WorkOrderTransitioned",
          reason: "Inicio por el técnico responsable",
          state: "in_progress",
          occurredAt: "2026-11-03T17:00:00.000Z",
        },
      ],
    },
  },
};

export const SinOrigen: Story = { args: { mode: "create", needsSource: true } };
export const ListaSinPermiso: Story = { args: { mode: "list", failure: "forbidden" } };
