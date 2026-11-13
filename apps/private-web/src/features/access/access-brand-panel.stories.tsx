import type { Meta, StoryObj } from "@storybook/react-vite";
import { AccessBrandPanel } from "./access-brand-panel";
const meta = {
  title: "Pantallas/Acceso",
  component: AccessBrandPanel,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Panel real del acceso: la diagonal azul termina en el borde de la columna, así que textos e iconos nunca quedan sobre el fondo claro, también en tableta.",
      },
    },
  },
  render: () => (
    <main className="access-layout">
      <AccessBrandPanel />
      <section className="access-card" aria-label="Ejemplo de acceso">
        <h2>Inicia sesión</h2>
        <p>Datos ficticios. El formulario real se revisa en la aplicación demo.</p>
      </section>
    </main>
  ),
} satisfies Meta<typeof AccessBrandPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const PanelLegible: Story = {};
