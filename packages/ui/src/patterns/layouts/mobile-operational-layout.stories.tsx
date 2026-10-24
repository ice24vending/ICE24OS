import type { Meta, StoryObj } from "@storybook/react-vite";

import { MOBILE } from "../../components/base/stories-kit.js";
import { componentDocs } from "../../stories/catalog-kit.js";
import { MobileOperationalLayout } from "./mobile-operational-layout.js";
import { LayoutMatrix, FieldSample } from "./stories-kit.js";

const meta = {
  title: "Layouts/Pantalla de campo",
  component: MobileOperationalLayout,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: componentDocs({
          summary:
            "Pantalla de campo (UI_UX §4.2, §14.4, §14.8): una mano y guantes. Una columna, texto de 18 px, objetivos de 64 px y acciones fijas en la zona del pulgar. No es la versión reducida del escritorio.",
          use: ["Orden de trabajo, bitácora sanitaria, entrega: tareas en sitio, con o sin red."],
          avoid: [
            "Pantallas de consulta de escritorio.",
            "Más de dos acciones abajo: las demás van en el contenido.",
          ],
          accessibility: [
            "Objetivos de 64 px con 12 px de separación (guantes).",
            "El estado de sincronización está junto al título.",
            "La barra de acciones no tapa el contenido (sticky, no fija).",
          ],
          copy: ["«Guardar en este dispositivo», «Completar orden», «Progreso 2 de 4»."],
        }),
      },
    },
  },
} satisfies Meta;

export default meta;
// Samples render their own data, so stories take no args.
type Story = StoryObj;

export const Normal: Story = { render: () => <FieldSample /> };

export const ModoLectura: Story = {
  name: "Modo lectura",
  render: () => <FieldSample readOnly />,
};

export const Movil: Story = {
  name: "Móvil",
  globals: MOBILE,
  render: () => <FieldSample />,
};

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => <LayoutMatrix component="MobileOperationalLayout" Sample={FieldSample} />,
};
