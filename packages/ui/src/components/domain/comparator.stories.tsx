import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../base/button.js";
import { RadioGroup, Radio } from "../base/choice.js";
import { TextArea } from "../base/field.js";
import { MOBILE, Showcase } from "../base/stories-kit.js";
import { Comparator, type ComparatorField } from "./comparator.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";

const CONFLICT: ComparatorField[] = [
  { id: "ppm", label: "Concentración", before: "150 ppm", after: "140 ppm" },
  {
    id: "photo",
    label: "Evidencia",
    before: <a href="#servidor">foto_servidor.jpg</a>,
    after: <a href="#dispositivo">foto_local.jpg</a>,
    changed: true,
    beforeText: "foto_servidor.jpg",
    afterText: "foto_local.jpg",
  },
  { id: "lot", label: "Lote de químico", before: "L-2201", after: "L-2201" },
  { id: "operator", label: "Capturó", before: "Operador de turno", after: "Operador de turno" },
];

const EXPECTED: ComparatorField[] = [
  {
    id: "chlorine",
    label: "Cloro libre",
    before: "100 a 200 ppm",
    after: "250 ppm",
    note: "Fuera del rango definido: se registrará una no conformidad.",
    noteTone: "danger",
  },
  { id: "temp", label: "Temperatura del agua", before: "≤ 25 °C", after: "22 °C", changed: false },
  {
    id: "ph",
    label: "pH",
    before: "6.5 a 8.5",
    after: "8.7",
    note: "Ligeramente fuera de rango.",
    noteTone: "warning",
  },
];

const DOCS = componentDocs({
  summary:
    "Comparación lado a lado (UI_UX §13.7, §14.18): anterior/propuesto, servidor/dispositivo o esperado/real. Por defecto lista solo los cambios; la diferencia se escribe («Cambió de 150 ppm a 140 ppm»).",
  use: [
    "Resolver un conflicto offline (con el formulario de resolución como contenido).",
    "Revisar cambios de una versión o comparar una medición con su criterio.",
  ],
  avoid: [
    "Elegir automáticamente una versión ganadora: la decisión es explícita (UI_UX §20.6).",
    "Comparar más de dos versiones: usa el historial.",
  ],
  accessibility: [
    "Tabla con encabezados de fila y columna; resumen asociado con `aria-describedby`.",
    "«Cambió» escrito además del fondo; «Mostrar N campos sin cambios» con `aria-expanded`.",
  ],
  copy: [
    "Lados con origen: «Versión del servidor», «Versión del dispositivo», «Esperado», «Real».",
    "Meta con autor y hora: «Capturada 19:02 por Ana».",
    "Pie: «Ninguna versión se eliminará de la auditoría.»",
  ],
});

const meta = {
  title: "Dominio/Comparator",
  component: Comparator,
  args: {
    title: "Conflicto de sincronización SYNC-0038",
    before: { label: "Versión del servidor", meta: "Actualizada 19:14 por Luis" },
    after: { label: "Versión del dispositivo", meta: "Capturada 19:02 por Ana" },
    fields: CONFLICT,
    showUnchanged: false,
    loading: false,
  },
  argTypes: {
    showUnchanged: {
      control: "boolean",
      description:
        "Por defecto solo se listan los cambios y un botón muestra el resto; `true` abre con todos los campos.",
    },
    loading: { control: "boolean" },
    fields: { control: false },
    titleAs: { control: "inline-radio", options: ["h2", "h3", "h4"] },
  },
  parameters: {
    docs: {
      description: {
        component: DOCS,
      },
    },
  },
} satisfies Meta<typeof Comparator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function ComparatorShowcase() {
  return (
    <>
      <Showcase title="Conflicto offline con resolución" stack>
        <Comparator
          title="Conflicto de sincronización SYNC-0038"
          before={{ label: "Versión del servidor", meta: "Actualizada 19:14 por Luis" }}
          after={{ label: "Versión del dispositivo", meta: "Capturada 19:02 por Ana" }}
          fields={CONFLICT}
        >
          <RadioGroup label="Resolución" name="resolution" required>
            <Radio value="server" label="Conservar versión del servidor" />
            <Radio value="device" label="Usar versión del dispositivo" />
            <Radio value="merge" label="Crear corrección combinada" />
          </RadioGroup>
          <TextArea label="Motivo" required help="Ninguna versión se eliminará de la auditoría." />
          <Button>Resolver</Button>
        </Comparator>
      </Showcase>
      <Showcase title="Esperado contra real" stack>
        <Comparator
          title="Bitácora SAN-102 · ICE24-000145"
          before={{ label: "Esperado" }}
          after={{ label: "Real", meta: "Medición de hoy 08:10" }}
          fields={EXPECTED}
        />
      </Showcase>
      <Showcase title="Todos los campos, sin diferencias y cargando" stack>
        <Comparator
          title="Cambios de la plantilla v3"
          before={{ label: "Versión 2" }}
          after={{ label: "Versión 3", meta: "Publicada por Calidad · motivo: ajuste de rango" }}
          fields={CONFLICT}
          showUnchanged
        />
        <Comparator
          title="Sin diferencias"
          before={{ label: "Anterior" }}
          after={{ label: "Actual" }}
          fields={[{ id: "a", label: "Lote", before: "L-1", after: "L-1" }]}
        />
        <Comparator
          title="Cargando comparación"
          before={{ label: "Anterior" }}
          after={{ label: "Actual" }}
          fields={[]}
          loading
        />
      </Showcase>
    </>
  );
}

export const Estados: Story = { render: () => <ComparatorShowcase /> };

export const Movil: Story = {
  name: "Móvil",
  globals: MOBILE,
  render: () => <ComparatorShowcase />,
};

const SIDES = {
  before: { label: "Versión del servidor", meta: "Actualizada 19:14 por Luis" },
  after: { label: "Versión del dispositivo", meta: "Capturada 19:02 por Ana" },
} as const;

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="Comparator"
      layout="list"
      cells={{
        normal: (
          <Comparator title="Conflicto SYNC-0038" titleAs="h3" {...SIDES} fields={CONFLICT} />
        ),
        loading: (
          <Comparator title="Conflicto SYNC-0038" titleAs="h3" {...SIDES} fields={[]} loading />
        ),
        empty: <Comparator title="Sin campos" titleAs="h3" {...SIDES} fields={[]} />,
        error: na(
          "si la comparación no se pudo cargar, la pantalla explica el error; el componente no inventa datos.",
        ),
        forbidden: na(
          "solo perfiles autorizados ven y resuelven conflictos; sin permiso no se muestra.",
        ),
        readonly: (
          <Comparator
            title="Comparación sin resolución"
            titleAs="h3"
            {...SIDES}
            fields={CONFLICT}
          />
        ),
        disabled: na("no tiene acciones propias además de mostrar u ocultar campos."),
        focus: <Comparator title="Conflicto SYNC-0038" titleAs="h3" {...SIDES} fields={CONFLICT} />,
      }}
    />
  ),
};
