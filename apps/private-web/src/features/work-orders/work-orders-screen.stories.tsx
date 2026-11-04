import type { Meta, StoryObj } from "@storybook/react-vite";
import { WorkOrdersScreen } from "./work-orders-screen";
import type { WorkOrder } from "@ice24/contracts";
import { demoOrderDefinition } from "../../server/demo/work-order-fixtures";
import { demoIds, demoUserId } from "../../server/demo/fixtures";
import "../maintenance/tickets.css";
import "../maintenance/maintenance.css";
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
  args: { mode: "list", contextId: "demo", csrfToken: "demo", items: [order] },
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
