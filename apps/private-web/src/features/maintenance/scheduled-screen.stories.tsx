import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScheduledScreen } from "./scheduled-screen";
import "./maintenance.css";
import type { ScheduledActivity } from "@ice24/contracts";

const items: ScheduledActivity[] = (
  ["scheduled", "upcoming", "overdue", "critical", "completed"] as const
).map((state, index) => ({
  id: `10000000-0000-4000-8000-00000000000${index}`,
  machineId: "20000000-0000-4000-8000-000000000001",
  branchId: "30000000-0000-4000-8000-000000000001",
  machineCode: "ICE24-DEMO",
  machineName: "Máquina ficticia",
  branchName: "Sucursal Centro",
  activityCode: `MNT-${index}`,
  name: "Revisar filtro",
  state,
  dueAt: "2026-11-05T16:00:00.000Z",
  alertAt: "2026-10-29T16:00:00.000Z",
  timezone: "America/Mexico_City",
  assigneeId: null,
  rowVersion: 1,
}));
const meta = {
  title: "Mantenimiento/Actividades programadas",
  component: ScheduledScreen,
  args: { items, filters: { limit: 50 }, calendar: false, nextCursor: null, today: "2026-11-03" },
  argTypes: {
    calendar: { control: "boolean" },
    readOnly: { control: "boolean" },
    failure: {
      control: "select",
      options: [undefined, "loading", "empty", "error", "forbidden", "offline"],
    },
  },
} satisfies Meta<typeof ScheduledScreen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Lista: Story = {};
export const Calendario: Story = { args: { calendar: true } };
/** Controls switch the same screen through the state matrix without duplicate page landmarks. */
export const MatrizDeEstados: Story = { args: { failure: "offline" } };
