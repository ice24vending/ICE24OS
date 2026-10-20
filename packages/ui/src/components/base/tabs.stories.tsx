import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

import { Badge } from "./badge.js";
import { MOBILE } from "./stories-kit.js";
import { Tabs } from "./tabs.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";
import { Banner } from "./banner.js";
import { EmptyState } from "./table.js";

const DOCS = componentDocs({
  summary:
    "Pestañas para dominios dentro de una entidad (UI_UX §10.1, §13.6): una sola parada de tabulación; flechas, Inicio y Fin.",
  use: [
    "Separar dominios de un mismo registro: Resumen, Técnico, Sanidad, Documentos.",
    '`activation="manual"` cuando cambiar de pestaña carga datos costosos.',
  ],
  avoid: [
    "Navegación global entre módulos: usa la barra lateral o la navegación inferior.",
    "Pasos de un proceso: usa un asistente por pasos.",
    "Más de 6–7 pestañas: agrupa o usa una página.",
  ],
  accessibility: [
    "`tablist` con nombre (`label`); la pestaña activa con `aria-selected`.",
    "Las deshabilitadas se saltan con las flechas.",
    "El contador de la pestaña lleva `label` para lectores.",
  ],
  copy: ["Sustantivos cortos: «Resumen», «Mantenimiento», «Historial»."],
});

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
        component: DOCS,
      },
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Manual: Story = { args: { activation: "manual" } };
export const Movil: Story = { name: "Móvil (desplazamiento horizontal)", globals: MOBILE };

const tabsWith = (content: ReactNode) => [
  { id: "resumen", label: "Resumen", content },
  { id: "historial", label: "Historial", content: <p>Eventos auditados.</p> },
];

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="Tabs"
      cells={{
        normal: <Tabs label="Normal" items={tabsWith(<p>Datos generales y estado actual.</p>)} />,
        loading: (
          <Tabs
            label="Carga"
            items={tabsWith(<span className="ids-skeleton" aria-busy="true" />)}
          />
        ),
        empty: (
          <Tabs label="Vacío" items={tabsWith(<EmptyState title="Sin eventos registrados" />)} />
        ),
        error: (
          <Tabs
            label="Error"
            items={tabsWith(
              <Banner tone="danger" title="No fue posible cargar el resumen" titleAs="p" />,
            )}
          />
        ),
        forbidden: na("las pestañas sin permiso no se dibujan."),
        readonly: na("las pestañas solo navegan; el modo lectura afecta a su contenido."),
        disabled: (
          <Tabs
            label="Deshabilitado"
            items={[
              ...tabsWith(<p>Datos generales.</p>),
              { id: "docs", label: "Documentos", content: null, disabled: true },
            ]}
          />
        ),
        focus: <Tabs label="Foco" items={tabsWith(<p>Datos generales.</p>)} />,
      }}
    />
  ),
};
