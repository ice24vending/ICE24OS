import type { Meta, StoryObj } from "@storybook/react-vite";
import { OperationalChart } from "./operational-chart.js";
const meta = {
  title: "Patrones/Gráfica operativa",
  component: OperationalChart,
  args: {
    title: "Estado operativo de máquinas",
    summary: "3 de 8 máquinas necesitan atención",
    items: [
      { label: "Disponible", value: 5, tone: "success" },
      { label: "En mantenimiento", value: 2, tone: "warning" },
      { label: "Fuera de servicio", value: 1, tone: "danger" },
    ],
  },
} satisfies Meta<typeof OperationalChart>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Apilada: Story = { args: { variant: "stacked" } };
export const Barras: Story = { args: { variant: "bars" } };
export const Columnas: Story = { args: { variant: "columns" } };
export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: (args) => (
    <>
      <OperationalChart {...args} />
      <OperationalChart {...args} title="Sin actividades" summary="No hay pendientes" items={[]} />
      <OperationalChart
        {...args}
        title="Consulta no disponible"
        summary="No fue posible consultar los datos"
        items={null}
      />
      <OperationalChart
        {...args}
        title="Sin conexión"
        summary="Conéctate para consultar los datos"
        items={null}
      />
      <OperationalChart {...args} title="Cargando datos" summary="Espera un momento" items={null} />
      <OperationalChart
        {...args}
        title="Consulta en modo lectura"
        summary="5 disponibles; 3 necesitan atención"
      />
    </>
  ),
};
