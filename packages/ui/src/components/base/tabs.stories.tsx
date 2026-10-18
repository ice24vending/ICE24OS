import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./badge.js";
import { MOBILE } from "./stories-kit.js";
import { Tabs } from "./tabs.js";

const meta = {
  title: "Base/Tabs",
  component: Tabs,
  args: {
    label: "Secciones de la máquina",
    activation: "automatic",
    items: [
      { id: "resumen", label: "Resumen", content: <p>Datos generales y estado actual.</p> },
      {
        id: "mantenimiento",
        label: "Mantenimiento",
        badge: (
          <Badge tone="brand" label="2 órdenes abiertas">
            2
          </Badge>
        ),
        content: <p>Órdenes y calendario.</p>,
      },
      { id: "sanidad", label: "Sanidad", content: <p>Controles y resultados.</p> },
      {
        id: "documentos",
        label: "Documentos",
        content: <p>Archivos de la máquina.</p>,
        disabled: true,
      },
      { id: "historial", label: "Historial", content: <p>Eventos auditados.</p> },
    ],
  },
  argTypes: {
    activation: {
      control: "inline-radio",
      options: ["automatic", "manual"],
      description: "`manual`: las flechas mueven el foco y Enter/Espacio seleccionan.",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Pestañas para dominios dentro de una entidad, no para navegación global (UI_UX §10.1). Una sola parada de tabulación; flechas, Inicio y Fin.",
      },
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Manual: Story = { args: { activation: "manual" } };
export const Movil: Story = { name: "Móvil (desplazamiento horizontal)", globals: MOBILE };
