import type { Meta, StoryObj } from "@storybook/react-vite";

import { DateField, Select, TextArea, TextField } from "./field.js";
import { MOBILE, Showcase } from "./stories-kit.js";

const BRANCHES = [
  { value: "centro", label: "Sucursal Centro" },
  { value: "norte", label: "Sucursal Norte" },
  { value: "sur", label: "Sucursal Sur (sin permiso)", disabled: true },
];

const meta = {
  title: "Base/Campos de formulario",
  component: TextField,
  args: {
    label: "Correo electrónico",
    type: "email",
    placeholder: "nombre@empresa.mx",
    help: "Recibirás aquí los avisos de mantenimiento.",
    error: "",
    required: false,
    readOnly: false,
    disabled: false,
  },
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "tel", "url", "search", "password", "number"],
    },
    help: { control: "text" },
    error: { control: "text", description: "Mensaje de validación; marca el campo como inválido." },
    readOnly: {
      control: "boolean",
      description: "Modo lectura: muestra el valor sin permitir cambios.",
    },
    prefix: { control: "text" },
    suffix: { control: "text", description: "Unidad (UI_UX §13.2 «Campo numérico»)." },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Etiqueta visible, ayuda, obligatorio (*), error y modo lectura. Texto de 16 px para evitar zoom en móvil (UI_UX §7.2).",
      },
    },
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Estados: Story = {
  render: (args) => (
    <Showcase title="Campos de texto" stack>
      <TextField {...args} label="Nombre de la sucursal" required help={undefined} placeholder="" />
      <TextField
        {...args}
        label="Correo"
        error="Indica un correo válido."
        defaultValue="correo-invalido"
      />
      <TextField
        {...args}
        label="Código de máquina"
        readOnly
        defaultValue="ICE24-000145"
        help={undefined}
      />
      <TextField
        {...args}
        label="Folio"
        disabled
        defaultValue="OT-00241"
        help="Lo asigna el sistema."
      />
      <TextField
        {...args}
        label="Lectura de cloro"
        type="number"
        suffix="ppm"
        help="Rango permitido: 0.2 a 1.5"
        placeholder=""
      />
      <TextArea
        label="Motivo del cambio"
        required
        maxLength={2000}
        showCount
        help="Al menos 10 caracteres."
      />
      <Select label="Sucursal" options={BRANCHES} placeholder="Selecciona una sucursal" required />
      <Select label="Sucursal asignada" options={BRANCHES} defaultValue="centro" readOnly />
      <DateField label="Fecha de servicio" required />
      <DateField label="Fecha y hora de muestreo" withTime error="La fecha no puede ser futura." />
    </Showcase>
  ),
};

export const Movil: Story = {
  name: "Móvil",
  globals: MOBILE,
  render: Estados.render!,
};
