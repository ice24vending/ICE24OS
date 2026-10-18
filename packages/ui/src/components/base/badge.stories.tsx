import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge, StatusTag } from "./badge.js";
import { ICON_NAMES } from "./icon.js";
import { Showcase } from "./stories-kit.js";

const TONES = ["success", "warning", "danger", "info", "nodata", "audit", "offline"] as const;

const meta = {
  title: "Base/StatusTag y Badge",
  component: StatusTag,
  args: {
    tone: "warning",
    children: "Atención preventiva",
    dimension: "Técnico",
    variant: "subtle",
  },
  argTypes: {
    tone: { control: "select", options: TONES },
    icon: { control: "select", options: [undefined, ...ICON_NAMES] },
    variant: { control: "inline-radio", options: ["subtle", "solid"] },
    dimension: {
      control: "text",
      description: "Se lee antes del estado («Técnico: Atención preventiva»); UI_UX §13.4.",
    },
    children: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Chip de estado: texto + icono, nunca solo color. Los iconos de dominio (herramienta, escudo, gota) llegan en F6-04.",
      },
    },
  },
} satisfies Meta<typeof StatusTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Estados: Story = {
  render: () => (
    <>
      <Showcase title="Tres estados de máquina por separado">
        <StatusTag tone="success" icon="activity" dimension="Operación">
          Disponible
        </StatusTag>
        <StatusTag tone="nodata" icon="activity" dimension="Operación">
          Apagada
        </StatusTag>
        <StatusTag tone="info" icon="activity" dimension="Operación">
          En mantenimiento
        </StatusTag>
        <StatusTag tone="danger" icon="activity" dimension="Operación">
          Fuera de servicio
        </StatusTag>
        <StatusTag tone="success" icon="settings" dimension="Técnico">
          Óptimo
        </StatusTag>
        <StatusTag tone="warning" icon="settings" dimension="Técnico">
          Atención preventiva
        </StatusTag>
        <StatusTag tone="danger" icon="settings" dimension="Técnico">
          Crítico
        </StatusTag>
        <StatusTag tone="success" dimension="Sanitario">
          Al día
        </StatusTag>
        <StatusTag tone="warning" dimension="Sanitario">
          Próximo a vencer
        </StatusTag>
        <StatusTag tone="danger" dimension="Sanitario">
          Acción correctiva
        </StatusTag>
      </Showcase>
      <Showcase title="Otras familias">
        <StatusTag tone="audit" dimension="Documento">
          Versión 3
        </StatusTag>
        <StatusTag tone="offline" dimension="Sincronización">
          Guardado en este dispositivo
        </StatusTag>
        <StatusTag tone="nodata" dimension="Indicador">
          Sin datos
        </StatusTag>
        <StatusTag tone="danger" variant="solid">
          Restringido
        </StatusTag>
      </Showcase>
      <Showcase title="Insignias">
        <Badge>12</Badge>
        <Badge tone="brand" label="4 órdenes pendientes">
          4
        </Badge>
        <Badge tone="danger" label="2 alertas críticas">
          2
        </Badge>
      </Showcase>
    </>
  ),
};
