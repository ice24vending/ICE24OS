import type { Meta, StoryObj } from "@storybook/react-vite";

import { StatusTag } from "./badge.js";
import { ButtonLink } from "./button.js";
import { Card } from "./card.js";
import { ICON_NAMES } from "./icon.js";
import { MOBILE, Showcase } from "./stories-kit.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";
import { Banner } from "./banner.js";
import { Button } from "./button.js";
import { EmptyState } from "./table.js";

const DOCS = componentDocs({
  summary:
    "Tarjeta (UI_UX §8.3, §8.6): superficie blanca con borde, radio de 14 px e icono en recuadro tenue según su semántica.",
  use: [
    "Agrupar un bloque con título: resumen de sucursal, KPI, sección de un expediente.",
    '`as="article"` para un registro independiente en una lista de tarjetas.',
    '`padding="flush"` para alojar una tabla.',
  ],
  avoid: [
    "Tarjetas dentro de tarjetas.",
    "Como botón gigante: si toda la tarjeta navega, pon un enlace claro en el título o las acciones.",
    "Sombras decorativas: la separación la dan el borde y el fondo.",
  ],
  accessibility: [
    "`section` con título es una región nombrada; el título usa el nivel correcto (`titleAs`).",
    "El icono es decorativo; la información va en el texto.",
  ],
  copy: [
    "Título con sustantivo: «Sucursal Centro», «Próximas actividades».",
    "Descripción breve: «8 máquinas · Responsable asignado».",
  ],
});

const meta = {
  title: "Base/Card",
  component: Card,
  args: {
    title: "Sucursal Centro",
    description: "8 máquinas · Responsable asignado",
    icon: "machine",
    tone: "brand",
    padding: "lg",
    children: "Contenido de la tarjeta.",
  },
  argTypes: {
    icon: { control: "select", options: [undefined, ...ICON_NAMES] },
    tone: {
      control: "select",
      options: ["brand", "success", "warning", "danger", "info", "nodata", "audit", "offline"],
      description: "Color del recuadro tenue del icono.",
    },
    padding: { control: "inline-radio", options: ["md", "lg", "flush"] },
    as: { control: "inline-radio", options: ["section", "article", "div"] },
    titleAs: { control: "inline-radio", options: ["h2", "h3", "h4"] },
    title: { control: "text" },
    description: { control: "text" },
    children: { control: "text" },
    footer: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component: DOCS,
      },
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function CardShowcase() {
  return (
    <Showcase title="Tarjetas">
      <Card
        title="Sucursal Centro"
        description="8 máquinas · Responsable asignado"
        icon="machine"
        actions={
          <ButtonLink href="#sucursal" variant="tertiary" size="sm">
            Ver sucursal
          </ButtonLink>
        }
        style={{ flex: "1 1 18rem" }}
      >
        <StatusTag tone="success">Activa</StatusTag>
      </Card>
      <Card
        title="Órdenes abiertas"
        icon="warning"
        tone="warning"
        footer="Actualizado hace 5 min"
        style={{ flex: "1 1 18rem" }}
      >
        3 órdenes requieren atención esta semana.
      </Card>
      <Card
        title="Sin datos"
        icon="nodata"
        tone="nodata"
        padding="md"
        style={{ flex: "1 1 18rem" }}
      >
        No hay lecturas en el periodo. Un indicador sin datos no se muestra como cero.
      </Card>
    </Showcase>
  );
}

export const Variantes: Story = { render: () => <CardShowcase /> };

export const Movil: Story = { name: "Móvil", globals: MOBILE, render: () => <CardShowcase /> };

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="Card"
      cells={{
        normal: (
          <Card title="Sucursal Centro" description="8 máquinas" icon="machine" titleAs="h3">
            Responsable asignado.
          </Card>
        ),
        loading: (
          <Card title="Sucursal Centro" icon="machine" titleAs="h3" aria-busy="true">
            <span className="ids-skeleton" />
          </Card>
        ),
        empty: (
          <Card title="Próximas actividades" icon="clock" titleAs="h3">
            <EmptyState title="Sin actividades programadas" />
          </Card>
        ),
        error: (
          <Card title="Próximas actividades" icon="clock" titleAs="h3">
            <Banner tone="danger" title="No fue posible cargar las actividades" titleAs="p" />
          </Card>
        ),
        forbidden: na(
          "sin permiso la tarjeta no se dibuja; nunca se muestra vacía con un candado.",
        ),
        readonly: (
          <Card
            title="Sucursal Centro"
            icon="machine"
            titleAs="h3"
            actions={
              <Button
                size="sm"
                variant="secondary"
                disabledReason="La cuenta está en modo lectura."
              >
                Editar
              </Button>
            }
          >
            8 máquinas
          </Card>
        ),
        disabled: na("una tarjeta no se deshabilita; se deshabilitan sus acciones."),
        focus: (
          <Card
            title="Sucursal Centro"
            icon="machine"
            titleAs="h3"
            actions={
              <ButtonLink href="#sucursal" variant="tertiary" size="sm">
                Ver sucursal
              </ButtonLink>
            }
          >
            8 máquinas
          </Card>
        ),
      }}
    />
  ),
};
