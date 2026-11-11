import type { Meta, StoryObj } from "@storybook/react-vite";
import { ExecutionScreen } from "./execution-screen";
import { demoExecutionDefinition } from "../../server/demo/work-order-fixtures";
import { demoIds, demoUserId } from "../../server/demo/fixtures";
import type { WorkOrder } from "@ice24/contracts";
import "./execution.css";
const order: WorkOrder = {
  id: demoIds.job(2003),
  folio: "OT-000004",
  machineId: demoIds.machine(1),
  machineCode: "ICE24-MTY-0001",
  branchId: demoIds.branch(1),
  sourceType: "ticket",
  sourceId: demoIds.request(900),
  ticketId: demoIds.request(900),
  activityId: null,
  assigneeId: demoUserId("technician"),
  assigneeName: "Ana Torres",
  templateId: demoIds.template(1),
  templateVersion: 1,
  definition: demoExecutionDefinition,
  state: "in_progress",
  dueAt: null,
  alertAt: null,
  rowVersion: 1,
  createdAt: "2026-11-03T16:00:00.000Z",
};
const meta = {
  title: "Mantenimiento/Ejecución y cierre",
  component: ExecutionScreen,
  args: {
    order,
    mode: "execute",
    csrfToken: "demo",
    contextId: "demo",
    detail: {
      revisions: [],
      reviews: [],
      missing: [],
      outOfRange: [],
      canExecute: true,
      canReview: false,
      canRequestCorrection: false,
      canReopen: false,
    },
  },
} satisfies Meta<typeof ExecutionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ejecucion: Story = {};
export const FaltantesDeCierre: Story = { args: { mode: "close" } };
export const SoloLectura: Story = { args: { detail: { ...meta.args.detail, canExecute: false } } };
export const Revision: Story = {
  args: { mode: "review", detail: { ...meta.args.detail, canExecute: false, canReview: true } },
};

export const RevisionSoloConsulta: Story = {
  args: {
    mode: "review",
    detail: {
      ...meta.args.detail,
      canExecute: false,
      canReview: false,
      canRequestCorrection: false,
    },
  },
};
