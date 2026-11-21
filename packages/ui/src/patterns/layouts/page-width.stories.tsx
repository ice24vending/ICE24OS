import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "../../components/base/card.js";
import { StatusPanel } from "../../status-panel.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";
import { PageWidth } from "./page-width.js";
import { PageHeader } from "./page-header.js";

const meta = {
  title: "Layouts/Ancho de página",
  component: PageWidth,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: componentDocs({
          summary:
            "Un margen común para listas y tableros, con una variante de lectura de hasta 960 px alineada a la izquierda.",
          use: [
            "Ancho completo para listas, tablas y tableros.",
            "Lectura para formularios y texto extenso.",
          ],
          avoid: [
            "Centrar otra columna dentro de la página.",
            "Repetir márgenes por pantalla: el layout de cuenta define --ids-page-gutter.",
          ],
          accessibility: [
            "No añade encabezados ni regiones por sí mismo.",
            "Permite usar el único main de la página o un contenedor dentro de él.",
          ],
          copy: ["El ancho no cambia los textos ni las acciones de la página."],
        }),
      },
    },
  },
} satisfies Meta<typeof PageWidth>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Completo: Story = {
  render: () => (
    <PageWidth>
      <PageHeader title="Resumen" />
      <Card title="Actividad de la cuenta">
        <p>Las listas y los tableros aprovechan el ancho disponible con un margen común.</p>
      </Card>
    </PageWidth>
  ),
};
export const Lectura: Story = {
  render: () => (
    <PageWidth variant="reading">
      <PageHeader title="Datos de la cuenta" />
      <Card title="Información general">
        <p>
          Los formularios y las lecturas conservan un máximo legible y el mismo inicio que las
          listas.
        </p>
      </Card>
    </PageWidth>
  ),
};
export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="PageWidth"
      layout="list"
      cells={{
        normal: (
          <PageWidth>
            <p>Listado con ancho completo.</p>
          </PageWidth>
        ),
        loading: (
          <PageWidth>
            <StatusPanel title="Cargando registros">Espera un momento.</StatusPanel>
          </PageWidth>
        ),
        empty: (
          <PageWidth>
            <StatusPanel title="Sin registros">Los registros aparecerán aquí.</StatusPanel>
          </PageWidth>
        ),
        error: (
          <PageWidth>
            <StatusPanel tone="danger" title="No fue posible cargar">
              Folio ICE24-UXD-0001.
            </StatusPanel>
          </PageWidth>
        ),
        forbidden: na("el contenedor no decide permisos."),
        readonly: (
          <PageWidth variant="reading">
            <StatusPanel title="Modo lectura">Puedes consultar la información.</StatusPanel>
          </PageWidth>
        ),
        disabled: na("el ancho no es una acción."),
        focus: (
          <PageWidth>
            <a href="#contenido">Ir al contenido</a>
          </PageWidth>
        ),
      }}
    />
  ),
};
