import type { Meta, StoryObj } from "@storybook/react-vite";
import { MaintenanceReview } from "./review-screen";

const meta = {
  title: "Mantenimiento/Revisión provisional",
  component: MaintenanceReview,
  args: {
    title: "Orden de trabajo",
    screen: "UI-WO-02",
    rows: [
      {
        id: "demo",
        code: "ICE24-DEMO",
        activity: "Revisar filtro",
        status: "En atención",
        order: "OT-DEMO-1",
        ticket: "TKT-DEMO-1",
        assignee: "Ana Torres",
      },
    ],
  },
  argTypes: {
    state: {
      control: "select",
      options: [
        undefined,
        "loading",
        "empty",
        "error",
        "forbidden",
        "offline",
        "read_only",
        "conflict",
      ],
    },
  },
} satisfies Meta<typeof MaintenanceReview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Normal: Story = {};
export const MatrizDeEstados: Story = {
  render: (args) => (
    <>
      {(
        ["loading", "empty", "error", "forbidden", "read_only", "offline", "conflict"] as const
      ).map((state) => (
        <MaintenanceReview key={state} {...args} state={state} embedded />
      ))}
    </>
  ),
};
import "./maintenance.css";
