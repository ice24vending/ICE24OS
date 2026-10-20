import type { Meta, StoryObj } from "@storybook/react-vite";

import { StatusPanel } from "./status-panel.js";
import { componentDocs, na, StateMatrix } from "./stories/catalog-kit.js";

const DOCS = componentDocs({
  summary:
    "Panel de estado heredado de la Fase 1. Se conserva por compatibilidad; las pantallas nuevas usan Banner y los estados globales de F6-10.",
  use: ["Solo en pantallas existentes que aún lo usan, hasta su migración."],
  avoid: ["En pantallas o componentes nuevos: usa Banner (mensajes) o EmptyState (vacío)."],
  accessibility: [
    'Región nombrada por su título; `role="alert"` solo para errores que interrumpen.',
  ],
  copy: ["Título con el estado: «Sincronización pendiente»."],
});

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
        component: DOCS,
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

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="StatusPanel"
      cells={{
        normal: (
          <StatusPanel title="Sincronización pendiente" tone="info">
            Hay 2 registros esperando conexión.
          </StatusPanel>
        ),
        loading: na("componente heredado sin estado de carga; usa esqueleto."),
        empty: (
          <StatusPanel title="Sin registros" tone="neutral">
            Todavía no hay información.
          </StatusPanel>
        ),
        error: (
          <StatusPanel title="No fue posible cargar" tone="danger" role="alert">
            El servicio no respondió.
          </StatusPanel>
        ),
        forbidden: (
          <StatusPanel title="Sin permiso" tone="warning">
            No tienes permiso para consultar este recurso.
          </StatusPanel>
        ),
        readonly: (
          <StatusPanel title="Cuenta en modo lectura" tone="warning">
            Puedes consultar, pero no modificar.
          </StatusPanel>
        ),
        disabled: na("no es interactivo."),
        focus: na("no recibe foco."),
      }}
    />
  ),
};
