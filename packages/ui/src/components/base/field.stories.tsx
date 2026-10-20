import type { Meta, StoryObj } from "@storybook/react-vite";

import { DateField, Select, TextArea, TextField } from "./field.js";
import { MOBILE, Showcase } from "./stories-kit.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";
import { Field, FieldError, FieldHelp, RequiredMark, useFieldIds } from "./field.js";

const BRANCHES = [
  { value: "centro", label: "Sucursal Centro" },
  { value: "norte", label: "Sucursal Norte" },
  { value: "sur", label: "Sucursal Sur (sin permiso)", disabled: true },
];

const DOCS = componentDocs({
  summary:
    "Campos de formulario (UI_UX §13.2): TextField, TextArea, Select y DateField con etiqueta visible, ayuda, obligatorio, error y modo lectura. Field, FieldHelp, FieldError y RequiredMark arman controles a la medida con la misma anatomía.",
  use: [
    "Capturar un dato con etiqueta visible; la unidad va como sufijo («ppm», «MXN»).",
    "Select nativo para listas cortas (hasta ~15 opciones); DateField para fechas.",
    "Field + useFieldIds para un control propio que deba verse y leerse igual.",
  ],
  avoid: [
    "El placeholder como etiqueta: desaparece al escribir.",
    "Deshabilitar un campo por modo lectura: usa `readOnly` para que el valor se lea y se pueda copiar.",
    "Validar mientras la persona escribe el primer carácter; valida al salir del campo o al enviar.",
  ],
  accessibility: [
    "La etiqueta está asociada al control; ayuda y error se leen con él (`aria-describedby`).",
    "El error marca `aria-invalid` y lleva icono además del color.",
    "Texto de 16 px para que el móvil no haga zoom.",
  ],
  copy: [
    "Etiquetas en oración: «Correo electrónico», «Fecha de servicio».",
    "Error que dice cómo corregir: «Escribe un correo válido, por ejemplo nombre@empresa.mx.»",
    "Ayuda breve: «Formato DD/MM/AAAA».",
  ],
});

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
        component: DOCS,
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

function CustomField() {
  const ids = useFieldIds({ help: "Lectura del medidor al iniciar el turno." });
  return (
    <Field
      label="Lectura inicial"
      required
      help="Lectura del medidor al iniciar el turno."
      ids={ids}
    >
      <input
        id={ids.id}
        aria-describedby={ids.describedBy}
        className="ids-input"
        inputMode="numeric"
      />
    </Field>
  );
}

/** Parts of the field anatomy, for custom controls (Field, FieldHelp, FieldError, RequiredMark). */
export const Anatomia: Story = {
  name: "Anatomía (campo a la medida)",
  render: () => (
    <Showcase title="Campo a la medida con Field" stack>
      <CustomField />
      <p>
        Etiqueta obligatoria <RequiredMark />
      </p>
      <FieldHelp>Ayuda: aparece debajo del control.</FieldHelp>
      <FieldError>Error: dice qué corregir.</FieldError>
    </Showcase>
  ),
};

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="TextField"
      cells={{
        normal: (
          <TextField label="Correo electrónico" type="email" help="Recibirás aquí los avisos." />
        ),
        loading: na(
          "los campos no cargan por sí mismos; mientras llega el formulario, la página usa esqueleto.",
        ),
        empty: <TextField label="Nombre de la sucursal" required />,
        error: (
          <TextField
            label="Correo electrónico"
            type="email"
            defaultValue="nombre@"
            error="Escribe un correo válido, por ejemplo nombre@empresa.mx."
          />
        ),
        forbidden: na(
          "un dato sin permiso de consulta no se dibuja; si se puede ver pero no editar, usa modo lectura.",
        ),
        readonly: (
          <>
            <TextField label="Código de máquina" defaultValue="ICE24-000145" readOnly />
            <Select label="Sucursal" options={BRANCHES} defaultValue="centro" readOnly />
          </>
        ),
        disabled: <TextField label="Máquina" disabled help="Se habilita al elegir una sucursal." />,
        focus: <TextField label="Correo electrónico" type="email" />,
      }}
    />
  ),
};
