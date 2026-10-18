import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge, StatusTag } from "./badge.js";
import { ICON_NAMES } from "./icon.js";
import { Showcase } from "./stories-kit.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";

const TONES = ["success", "warning", "danger", "info", "nodata", "audit", "offline"] as const;

const DOCS = componentDocs({
  summary:
    "StatusTag (chip de estado, UI_UX §13.4) y Badge (contador). El chip siempre lleva texto e icono, y su dimensión se lee antes del estado.",
  use: [
    "StatusTag: el estado de una entidad en una dimensión («Técnico: Atención preventiva»).",
    "Badge: un número junto a un destino de navegación, pestaña o encabezado.",
    "Para los tres estados de máquina usa MachineTriad.",
  ],
  avoid: [
    "Un chip genérico sin dimensión cuando hay varias familias en la pantalla.",
    "Chips como botones o filtros: no son interactivos.",
    "Badge con el total histórico: cuenta solo lo relevante (UI_UX §26.2).",
  ],
  accessibility: [
    "`dimension` se lee antes del estado; el icono es decorativo.",
    "Badge numérico con `label` («4 pendientes»).",
    "No reciben foco.",
  ],
  copy: [
    "Estados del glosario del PRD: «Disponible», «Atención preventiva», «Acción correctiva».",
    "«Sin datos» cuando no se puede evaluar.",
  ],
});

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
        component: DOCS,
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

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="StatusTag"
      cells={{
        normal: (
          <>
            <StatusTag tone="success" dimension="Operación">
              Disponible
            </StatusTag>
            <Badge tone="brand" label="4 órdenes pendientes">
              4
            </Badge>
          </>
        ),
        loading: na(
          "el chip muestra un estado conocido; durante la carga, el contenedor usa esqueleto.",
        ),
        empty: (
          <>
            <StatusTag tone="nodata" dimension="Indicador">
              Sin datos
            </StatusTag>
            <Badge label="Sin pendientes">0</Badge>
          </>
        ),
        error: (
          <StatusTag tone="danger" dimension="Sincronización">
            Error al sincronizar
          </StatusTag>
        ),
        forbidden: na("un estado sin permiso de consulta no se dibuja."),
        readonly: (
          <StatusTag tone="warning" icon="lock">
            Modo lectura
          </StatusTag>
        ),
        disabled: na("los chips no son interactivos."),
        focus: na("no reciben foco: no son interactivos."),
      }}
    />
  ),
};
