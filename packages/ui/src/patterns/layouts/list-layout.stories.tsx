import type { Meta, StoryObj } from "@storybook/react-vite";

import { MOBILE } from "../../components/base/stories-kit.js";
import { componentDocs } from "../../stories/catalog-kit.js";
import { ListLayout } from "./list-layout.js";
import { Button } from "../../components/base/button.js";
import { PageHeader } from "./page-header.js";
import { LayoutMatrix, ListSample } from "./stories-kit.js";

const meta = {
  title: "Layouts/Lista",
  component: ListLayout,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: componentDocs({
          summary:
            "Página de lista (UI_UX §11.3): encabezado, acciones, filtros, tabla que se vuelve tarjetas en móvil y paginación. Un estado global reemplaza la lista y conserva encabezado y filtros.",
          use: ["Catálogos y registros con filtros: máquinas, órdenes, documentos, auditoría."],
          avoid: [
            "Una sola entidad (usa DetailLayout).",
            "Ocultar filtros activos en móvil: el botón dice cuántos hay.",
          ],
          accessibility: [
            "Un solo `h1` (PageHeader).",
            "El botón «Filtros» tiene `aria-expanded` y `aria-controls`.",
            "La tabla conserva su semántica también como tarjetas.",
          ],
          copy: ["«Solicitar alta», «Filtros (2)», «Página 1 de 3»."],
        }),
      },
    },
  },
} satisfies Meta;

export default meta;
// Samples render their own data, so stories take no args.
type Story = StoryObj;

export const Normal: Story = { render: () => <ListSample /> };

export const ModoLectura: Story = {
  name: "Modo lectura",
  render: () => <ListSample readOnly />,
};

export const Movil: Story = {
  name: "Móvil",
  globals: MOBILE,
  render: () => <ListSample />,
};

export const Encabezado: Story = {
  name: "Encabezado de página",
  render: () => (
    <PageHeader
      eyebrow="Operación"
      title="Máquinas"
      description="Encabezado común a todos los layouts: el único h1 de la página."
      actions={<Button>Acción primaria</Button>}
    />
  ),
};

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => <LayoutMatrix component="ListLayout" Sample={ListSample} />,
};
