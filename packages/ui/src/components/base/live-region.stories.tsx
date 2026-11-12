import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ComponentProps } from "react";
import { Button } from "./button.js";
import { LiveRegion } from "./live-region.js";
import { Showcase } from "./stories-kit.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";
function AnnouncementExample(args: ComponentProps<typeof LiveRegion>) {
  const [visible, setVisible] = useState(false);
  return (
    <Showcase title="Anuncio persistente" stack>
      <Button icon="check" onClick={() => setVisible(!visible)}>
        {visible ? "Limpiar mensaje" : "Confirmar acción"}
      </Button>
      <LiveRegion {...args}>{visible ? args.children : null}</LiveRegion>
    </Showcase>
  );
}
const meta = {
  title: "Base/LiveRegion",
  component: LiveRegion,
  args: { role: "status", children: "Registro guardado" },
  argTypes: {
    role: { control: "inline-radio", options: ["status", "alert"] },
    children: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component: componentDocs({
          summary:
            "Región montada antes de la acción; cambia solo el contenido y no mueve el foco.",
          use: ["Confirmaciones, progreso y errores del producto."],
          avoid: [
            "Duplicar el mensaje en otro contenedor vivo.",
            "Usar alert para información no bloqueante.",
          ],
          accessibility: [
            "Vacía usa ids-visually-hidden; nunca display:none.",
            "status es polite y atómico; alert mantiene assertive implícito.",
          ],
          copy: ["Registro guardado", "No se pudo guardar. Revisa tu conexión."],
        }),
      },
    },
  },
} satisfies Meta<typeof LiveRegion>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = { render: (args) => <AnnouncementExample {...args} /> };
export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="LiveRegion"
      cells={{
        normal: <LiveRegion>Registro guardado</LiveRegion>,
        loading: <LiveRegion>Guardando registro…</LiveRegion>,
        empty: (
          <>
            <LiveRegion />
            <p>La región vacía permanece disponible para el siguiente anuncio.</p>
          </>
        ),
        error: <LiveRegion role="alert">No se pudo guardar. Revisa tu conexión.</LiveRegion>,
        forbidden: <LiveRegion role="alert">No tienes permiso para guardar.</LiveRegion>,
        readonly: <LiveRegion>Modo consulta. Los datos no se modificaron.</LiveRegion>,
        disabled: na("la región no se deshabilita; se actualiza cuando hay información."),
        focus: na("no mueve el foco; conserva el comportamiento del flujo que la utiliza."),
      }}
    />
  ),
};
