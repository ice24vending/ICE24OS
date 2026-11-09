import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConflictComparison } from "./synchronization-center";
import { conflictFixture } from "../../server/demo/conflict-fixture";
import { demoIds, demoUserId } from "../../server/demo/fixtures";
import { demoExecutionDefinition } from "../../server/demo/work-order-fixtures";
const conflict = conflictFixture({
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
  rowVersion: 2,
  createdAt: "2026-10-20T16:00:00.000Z",
});
const meta = {
  title: "Mantenimiento/Sincronización",
  component: ConflictComparison,
  decorators: [
    (Story) => (
      <main className="sync-center">
        <h1>Comparación de versiones</h1>
        <Story />
      </main>
    ),
  ],
  args: { conflict, canResolve: true, onResolve: fn(async () => undefined) },
} satisfies Meta<typeof ConflictComparison>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Administrador: Story = {};
export const Tecnico: Story = { args: { canResolve: false } };
export const MatrizDeEstados: Story = {
  render: (args) => (
    <>
      <h2>Administrador: elige y confirma</h2>
      <ConflictComparison {...args} />
      <h2>Técnico: consulta sin resolver</h2>
      <ConflictComparison {...args} canResolve={false} />
      <h2>Resolución en curso</h2>
      <ConflictComparison {...args} busy />
    </>
  ),
};
export const Resuelta: Story = {
  args: {
    conflict: {
      ...conflict,
      state: "resolved",
      current: {
        order: { ...conflict.server.order, rowVersion: 3 },
        execution: conflict.local.execution,
      },
      resolution: {
        actorId: demoUserId("owner"),
        reason: "Evidencia revisada con el técnico",
        strategy: "local",
        orderVersion: 3,
        resolvedAt: conflict.createdAt,
      },
    },
  },
};
