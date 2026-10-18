import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";
import { TransitionFeedbackBanner } from "./feedback.js";

const DOCS = componentDocs({
  summary:
    "Resultado recuperable de una transición fallida, dentro del registro afectado. Un conflicto (412) ofrece «Actualizar»: vuelve a leer y nunca reenvía. Un error ofrece «Reintentar» con la misma versión y clave, así que no duplica efectos.",
  use: [
    "Después de «Enterado», «Atender», «Reintentar trabajo» u otra transición con versión esperada.",
    "Lo usan CriticalAlert y JobStatus; úsalo igual en transiciones nuevas.",
  ],
  avoid: [
    "Errores de carga de la página: usa el estado global de la pantalla.",
    "Reenviar automáticamente después de un conflicto: la persona decide con datos frescos.",
  ],
  accessibility: [
    '`role="alert"`: se anuncia en cuanto aparece.',
    "El título baja un nivel respecto al registro (`titleAs`).",
  ],
  copy: [
    "Conflicto: «La información cambió» + «El aviso cambió desde que lo consultaste.»",
    "Error: «No fue posible completar la acción» + «No se registró ningún cambio.»",
  ],
});

const meta = {
  title: "Dominio/TransitionFeedbackBanner",
  component: TransitionFeedbackBanner,
  args: {
    feedback: { kind: "conflict", message: "El aviso cambió desde que lo consultaste." },
    onRefresh: fn(),
    onRetry: fn(),
    titleAs: "p",
  },
  argTypes: { titleAs: { control: "inline-radio", options: ["h3", "h4", "p"] } },
  parameters: { docs: { description: { component: DOCS } } },
} satisfies Meta<typeof TransitionFeedbackBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="TransitionFeedbackBanner"
      layout="list"
      cells={{
        normal: na("solo aparece cuando una transición falla."),
        loading: na("mientras la transición corre, el botón del registro muestra el progreso."),
        empty: na("sin fallo no se dibuja."),
        error: (
          <TransitionFeedbackBanner
            feedback={{ kind: "error", message: "No se registró ningún cambio." }}
            onRetry={fn()}
          />
        ),
        forbidden: (
          <TransitionFeedbackBanner
            feedback={{
              kind: "error",
              title: "No tienes permiso para esta acción",
              message: "Tu rol cambió desde que abriste la página. No se registró ningún cambio.",
            }}
          />
        ),
        readonly: (
          <TransitionFeedbackBanner
            feedback={{
              kind: "error",
              title: "La cuenta pasó a modo lectura",
              message: "No se registró ningún cambio. Puedes seguir consultando.",
            }}
          />
        ),
        disabled: na("no tiene estado deshabilitado."),
        focus: (
          <TransitionFeedbackBanner
            feedback={{ kind: "conflict", message: "El aviso cambió desde que lo consultaste." }}
            onRefresh={fn()}
          />
        ),
      }}
    />
  ),
};
