import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox, RadioGroup, Switch } from "./choice.js";
import { MOBILE, Showcase } from "./stories-kit.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";
import { Radio } from "./choice.js";

const FREQUENCIES = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual", description: "Frecuencia de fábrica" },
  { value: "quarterly", label: "Trimestral" },
];

const DOCS = componentDocs({
  summary:
    "Checkbox, RadioGroup/Radio y Switch sobre controles nativos (UI_UX §13.2): teclado de serie y toda la fila como área táctil de 44 px.",
  use: [
    "Checkbox: aceptar, confirmar responsabilidad o elegir varios elementos.",
    "RadioGroup: elegir una opción entre 2 y 6 visibles a la vez.",
    "Switch: un ajuste que se aplica en el momento («Notificar por correo»).",
  ],
  avoid: [
    "Switch dentro de un formulario que se guarda con un botón: usa Checkbox.",
    "RadioGroup con muchas opciones: usa Select.",
    "Una casilla para aceptar algo que no tiene consecuencia.",
  ],
  accessibility: [
    "Fieldset con leyenda en RadioGroup; flechas para moverse entre opciones.",
    "Espacio marca la casilla; el texto también la marca.",
    "El interruptor dice «Activado/Desactivado»; el estado no depende del color.",
  ],
  copy: [
    "Casilla en primera persona: «Confirmo que revisé los datos».",
    "Leyenda como pregunta o sustantivo: «Frecuencia de limpieza».",
    "Interruptor con el efecto: «Notificar al dueño por correo».",
  ],
});

const meta = {
  title: "Base/Selección",
  component: Checkbox,
  args: {
    label: "Confirmo que revisé los datos",
    help: "",
    error: "",
    required: false,
    readOnly: false,
    disabled: false,
    indeterminate: false,
  },
  argTypes: {
    help: { control: "text" },
    error: { control: "text" },
    readOnly: { control: "boolean", description: "Se ve el valor; clic y Espacio no lo cambian." },
  },
  parameters: {
    docs: {
      description: {
        component: DOCS,
      },
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function ChoiceShowcase() {
  return (
    <Showcase title="Selección" stack>
      <Checkbox label="Confirmo que revisé los datos" required />
      <Checkbox label="Pieza instalada" defaultChecked readOnly help="Modo lectura." />
      <Checkbox label="Todas las sucursales" indeterminate />
      <Checkbox label="Notificar al dueño" disabled help="Solo el propietario puede cambiarlo." />
      <Checkbox label="Acepto la responsabilidad" error="Debes confirmar para continuar." />
      <RadioGroup
        label="Frecuencia de limpieza"
        name="frecuencia"
        options={FREQUENCIES}
        defaultValue="monthly"
        required
      />
      <RadioGroup
        label="Unidad"
        name="unidad"
        orientation="horizontal"
        options={FREQUENCIES}
        defaultValue="weekly"
        readOnly
        help="Definida por la plantilla publicada."
      />
      <Switch label="Avisos por correo" help="Se aplica de inmediato." defaultChecked />
      <Switch label="Modo mantenimiento" readOnly />
      <Switch label="Integración de pagos" disabled />
    </Showcase>
  );
}

export const Estados: Story = { render: () => <ChoiceShowcase /> };

export const Movil: Story = { name: "Móvil", globals: MOBILE, render: () => <ChoiceShowcase /> };

export const Opciones: StoryObj<typeof RadioGroup> = {
  name: "RadioGroup (controles)",
  render: (args) => <RadioGroup {...args} />,
  args: {
    label: "Frecuencia de limpieza",
    name: "frecuencia-playground",
    options: FREQUENCIES,
    defaultValue: "monthly",
    orientation: "vertical",
    readOnly: false,
    disabled: false,
    required: true,
    error: "",
  },
  argTypes: {
    orientation: { control: "inline-radio", options: ["vertical", "horizontal"] },
    error: { control: "text" },
  },
};

export const Interruptor: StoryObj<typeof Switch> = {
  name: "Switch (controles)",
  render: (args) => <Switch {...args} />,
  args: {
    label: "Avisos por correo",
    help: "Se aplica de inmediato.",
    readOnly: false,
    disabled: false,
    onText: "Activado",
    offText: "Desactivado",
  },
};

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="Checkbox"
      cells={{
        normal: (
          <>
            <Checkbox label="Confirmo que revisé los datos" />
            <RadioGroup label="Unidad" name="matriz-unidad" defaultValue="kg">
              <Radio value="kg" label="Kilogramos" />
              <Radio value="bolsa" label="Bolsas" />
            </RadioGroup>
            <Switch label="Notificar por correo" defaultChecked />
          </>
        ),
        loading: na(
          "las opciones son locales; si dependen de la API, la página muestra esqueleto.",
        ),
        empty: (
          <RadioGroup
            label="Frecuencia de limpieza"
            name="matriz-vacia"
            options={FREQUENCIES}
            required
          />
        ),
        error: (
          <Checkbox
            label="Acepto la responsabilidad"
            required
            error="Debes confirmar para continuar."
          />
        ),
        forbidden: na(
          "la opción sin permiso se oculta; si se ve, se explica con `help` y queda deshabilitada.",
        ),
        readonly: (
          <>
            <Checkbox label="Pieza instalada" defaultChecked readOnly />
            <Switch label="Modo mantenimiento" readOnly defaultChecked />
          </>
        ),
        disabled: (
          <Checkbox
            label="Notificar al dueño"
            disabled
            help="Solo el propietario puede cambiarlo."
          />
        ),
        focus: <Checkbox label="Confirmo que revisé los datos" />,
      }}
    />
  ),
};
