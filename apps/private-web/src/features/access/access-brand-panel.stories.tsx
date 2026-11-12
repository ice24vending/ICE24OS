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
          "Panel real del acceso: la superficie opaca mantiene el contraste de todos los textos e iconos sobre el fondo decorativo, también en tableta.",
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
