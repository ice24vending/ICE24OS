import type { Meta, StoryObj } from "@storybook/react-vite";

import { MOBILE } from "../../components/base/stories-kit.js";
import { componentDocs } from "../../stories/catalog-kit.js";
import { DashboardLayout, KpiCard } from "./dashboard-layout.js";
import { LayoutMatrix, DashboardSample } from "./stories-kit.js";

const meta = {
  title: "Layouts/Dashboard",
  component: DashboardLayout,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: componentDocs({
          summary:
            "Dashboard (UI_UX §14.3, §15.1): indicadores con periodo, alcance y completitud, y tarjetas en una rejilla de 1 a 3 columnas.",
          use: ["Inicio por rol, paneles de sucursal y paneles globales ICE24."],
          avoid: [
            "Mostrar 0 cuando no hay datos: KpiCard dice «Sin datos».",
            "Tendencias sin una comparación válida.",
          ],
          accessibility: [
            "Indicadores en una región con nombre; cada uno es un artículo con `h3`.",
          ],
          copy: ["«Sin datos», «Datos parciales», «Hoy · 2 sucursales»."],
        }),
      },
    },
  },
} satisfies Meta;

export default meta;
// Samples render their own data, so stories take no args.
type Story = StoryObj;

export const Normal: Story = { render: () => <DashboardSample /> };

export const ModoLectura: Story = {
  name: "Modo lectura",
  render: () => <DashboardSample readOnly />,
};

export const Movil: Story = {
  name: "Móvil",
  globals: MOBILE,
  render: () => <DashboardSample />,
};

export const Indicadores: Story = {
  name: "Indicadores (KpiCard)",
  render: () => (
    <div className="ids-dashboard-layout__kpis">
      <KpiCard label="Hielo producido" value="1,240" unit="kg" period="Hoy" />
      <KpiCard label="Hielo producido" value="980" unit="kg" period="Hoy" completeness="partial" />
      <KpiCard label="Ventas" value={null} period="Hoy" />
    </div>
  ),
};

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => <LayoutMatrix component="DashboardLayout" Sample={DashboardSample} />,
};
