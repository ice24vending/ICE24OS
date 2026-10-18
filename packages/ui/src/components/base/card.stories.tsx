import type { Meta, StoryObj } from "@storybook/react-vite";

import { StatusTag } from "./badge.js";
import { ButtonLink } from "./button.js";
import { Card } from "./card.js";
import { ICON_NAMES } from "./icon.js";
import { MOBILE, Showcase } from "./stories-kit.js";

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
        component:
          "Superficie blanca con borde definido y radio de 14 px (UI_UX §8.3, §8.6). Icono en recuadro tenue según semántica.",
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
