import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox, RadioGroup, Switch } from "./choice.js";
import { MOBILE, Showcase } from "./stories-kit.js";

const FREQUENCIES = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual", description: "Frecuencia de fábrica" },
  { value: "quarterly", label: "Trimestral" },
];

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
        component:
          "Checkbox, RadioGroup y Switch sobre controles nativos: teclado de serie y fila completa de 44 px como área táctil.",
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
