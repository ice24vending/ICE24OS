import type { Meta, StoryObj } from "@storybook/react-vite";

import { StatusPanel } from "./status-panel.js";

const meta = {
  title: "Base/StatusPanel",
  component: StatusPanel,
  args: {
    title: "Sincronización pendiente",
    tone: "info",
    children: "Hay 2 registros esperando conexión. Se enviarán en cuanto vuelva la red.",
  },
  argTypes: {
    tone: {
      control: "inline-radio",
      options: ["neutral", "info", "success", "warning", "danger"],
      description: "Intención del mensaje. El color nunca es la única señal: el título la dice.",
    },
    role: {
      control: "inline-radio",
      options: [undefined, "status", "alert"],
      description: "`alert` solo para errores que interrumpen; `status` para avisos que no.",
    },
    children: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Panel de estado existente (Fase 1). Sirve de ejemplo del catálogo; F6-03 lo sustituirá por Banner y los estados globales de F6-10.",
      },
    },
  },
} satisfies Meta<typeof StatusPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Informativo: Story = {};

export const Exito: Story = {
  args: {
    title: "Mantenimiento registrado",
    tone: "success",
    role: "status",
    children: "La evidencia quedó guardada y el calendario se actualizó.",
  },
};

export const Advertencia: Story = {
  args: {
    title: "Frecuencia distinta de fábrica",
    tone: "warning",
    children: "El valor elegido puede afectar la garantía del equipo.",
  },
};

export const Fallo: Story = {
  name: "Error",
  args: {
    title: "No fue posible guardar",
    tone: "danger",
    role: "alert",
    children: "El servicio no respondió. No se envió ningún cambio; intenta nuevamente.",
  },
};

export const Neutral: Story = {
  args: {
    title: "Sin registros",
    tone: "neutral",
    children: "Todavía no hay máquinas en esta sucursal.",
  },
};
