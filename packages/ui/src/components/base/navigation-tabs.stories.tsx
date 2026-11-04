import type { Meta, StoryObj } from "@storybook/react-vite";
import { NavigationTabs } from "./tabs.js";
const items = [
  { href: "/maintenance", label: "Calendario", icon: "calendar" as const, current: true },
  { href: "/maintenance?view=list", label: "Lista", icon: "list" as const },
  { href: "/maintenance/tickets", label: "Tickets", icon: "inbox" as const },
  { href: "/maintenance/work-orders", label: "Órdenes", icon: "tool" as const },
];
const meta = {
  title: "Base/NavigationTabs",
  component: NavigationTabs,
  args: { label: "Mantenimiento", items },
} satisfies Meta<typeof NavigationTabs>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Navegacion: Story = {};
export const MatrizDeEstados: Story = {
  render: () => (
    <div className="story-stack">
      {items.map((selected, index) => (
        <NavigationTabs
          key={selected.href}
          label={`Destino seleccionado ${index + 1}`}
          items={items.map((item) => ({ ...item, current: item.href === selected.href }))}
        />
      ))}
    </div>
  ),
};
