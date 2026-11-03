import type { Meta, StoryObj } from "@storybook/react-vite";
import { TicketsScreen } from "./tickets-screen";
import "./tickets.css";
import "../files/files.css";
const meta = {
  title: "Mantenimiento/Tickets",
  component: TicketsScreen,
  args: {
    mode: "create",
    contextId: "demo",
    csrfToken: "demo",
    canCreate: true,
    canEdit: true,
    canUpload: true,
    machines: [
      { id: "c0000000-0000-4000-8000-000000000001", label: "ICE24-MTY-0001 · Despachadora Juárez" },
    ],
  },
  argTypes: {
    failure: {
      control: "select",
      options: [undefined, "loading", "empty", "error", "forbidden", "offline", "conflict"],
    },
  },
} satisfies Meta<typeof TicketsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Crear: Story = {};
export const MatrizDeEstados: Story = { args: { failure: "offline" } };
export const SoloLectura: Story = { args: { readOnly: true } };
export const SinPermiso: Story = { args: { canCreate: false } };
