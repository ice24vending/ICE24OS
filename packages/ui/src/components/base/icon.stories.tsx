import type { Meta, StoryObj } from "@storybook/react-vite";

import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";
import { IconButton } from "./button.js";
import { Icon, ICON_NAMES, Spinner } from "./icon.js";
import { Showcase } from "./stories-kit.js";

const DOCS = componentDocs({
  summary:
    "Iconos lineales propios (UI_UX §8.7): 24 × 24, trazo 2 y extremos redondeados, sin dependencia externa. Incluye los de dominio (herramienta, escudo, gota, sincronización…) y el Spinner de carga.",
  use: [
    "Acompañar un texto: botones, chips, banners, encabezados de tarjeta.",
    "IconButton para acciones repetidas con un icono inequívoco (cerrar, menú).",
    "Spinner solo dentro de un botón o indicador de carga breve.",
  ],
  avoid: [
    "Un icono como único portador de información: siempre va con texto o nombre accesible.",
    "Iconos ambiguos para estados críticos (UI_UX §8.7).",
    "Spinner para cargas de página: usa esqueleto.",
  ],
  accessibility: [
    'Sin `label` el icono es decorativo (`aria-hidden`); con `label` es `role="img"` con nombre.',
    "El Spinner es decorativo y se detiene con «reducir movimiento».",
  ],
  copy: ["`label` describe la función, no el dibujo: «Cerrar aviso», no «Equis»."],
});

const meta = {
  title: "Base/Iconos",
  component: Icon,
  args: { name: "tool", size: 24, label: "" },
  argTypes: {
    name: { control: "select", options: ICON_NAMES },
    size: { control: "inline-radio", options: [16, 20, 24] },
    label: {
      control: "text",
      description: "Nombre accesible. Vacío = decorativo (oculto para lectores de pantalla).",
    },
  },
  parameters: { docs: { description: { component: DOCS } } },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Juego: Story = {
  name: "Juego de iconos",
  render: () => (
    <Showcase title="Iconos disponibles">
      {ICON_NAMES.map((name) => (
        <span key={name} className="story-icon">
          <Icon name={name} size={24} />
          <code>{name}</code>
        </span>
      ))}
    </Showcase>
  ),
};

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="Icon"
      cells={{
        normal: (
          <span>
            <Icon name="shield" /> Sanitario
          </span>
        ),
        loading: <Spinner />,
        empty: na("un icono siempre tiene forma; sin nombre no se dibuja."),
        error: <Icon name="danger" label="Error" />,
        forbidden: <Icon name="lock" label="Sin permiso" />,
        readonly: (
          <span>
            <Icon name="lock" /> Modo lectura
          </span>
        ),
        disabled: na("los iconos no se deshabilitan; se deshabilita el botón que los contiene."),
        focus: <IconButton icon="close" label="Cerrar aviso" />,
      }}
    />
  ),
};
