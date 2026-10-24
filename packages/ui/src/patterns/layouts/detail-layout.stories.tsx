import type { Meta, StoryObj } from "@storybook/react-vite";

import { MOBILE } from "../../components/base/stories-kit.js";
import { componentDocs } from "../../stories/catalog-kit.js";
import { DetailLayout } from "./detail-layout.js";
import { LayoutMatrix, DetailSample } from "./stories-kit.js";

const meta = {
  title: "Layouts/Detalle",
  component: DetailLayout,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: componentDocs({
          summary:
            "Página de detalle (UI_UX §11.4, §14.6): identidad y folio, estados, acciones según permiso, resumen, pestañas con «Historial» al final y panel lateral que se apila en tableta y móvil.",
          use: ["Expediente de máquina, orden de trabajo, documento, usuario."],
          avoid: [
            "Acciones de gran alcance en el panel lateral (UI_UX §11.7).",
            "Mostrar acciones que el permiso no permite.",
          ],
          accessibility: [
            "Pestañas con flechas (Tabs).",
            "El panel lateral es un `complementary` con nombre.",
          ],
          copy: ["«Historial», «Programar mantenimiento», «Registrar lectura»."],
        }),
      },
    },
  },
} satisfies Meta;

export default meta;
// Samples render their own data, so stories take no args.
type Story = StoryObj;

export const Normal: Story = { render: () => <DetailSample /> };

export const ModoLectura: Story = {
  name: "Modo lectura",
  render: () => <DetailSample readOnly />,
};

export const Movil: Story = {
  name: "Móvil",
  globals: MOBILE,
  render: () => <DetailSample />,
};

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => <LayoutMatrix component="DetailLayout" Sample={DetailSample} />,
};
