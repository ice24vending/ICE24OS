import type { Meta, StoryObj } from "@storybook/react-vite";

import { MOBILE } from "../../components/base/stories-kit.js";
import { componentDocs } from "../../stories/catalog-kit.js";
import { WizardLayout } from "./wizard-layout.js";
import { LayoutMatrix, WizardSample } from "./stories-kit.js";

const meta = {
  title: "Layouts/Flujo por pasos",
  component: WizardLayout,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: componentDocs({
          summary:
            "Flujo por pasos (UI_UX §11.6): pasos con su estado, progreso, anterior/siguiente con validación por paso y revisión final antes de enviar.",
          use: ["Alta de equipo, importación de Excel, transferencia, reactivación."],
          avoid: [
            "Formularios de una sola pantalla.",
            "Validar solo al final: cada paso dice qué falta antes de avanzar.",
          ],
          accessibility: [
            "El foco va al título del paso en cada cambio y al validar.",
            "Los errores se anuncian (`role=alert`).",
            "`aria-current=step` y texto oculto con el estado de cada paso.",
          ],
          copy: ["«Siguiente», «Anterior», «Revisión», «Enviar solicitud»."],
        }),
      },
    },
  },
} satisfies Meta;

export default meta;
// Samples render their own data, so stories take no args.
type Story = StoryObj;

export const Normal: Story = { render: () => <WizardSample /> };

export const ModoLectura: Story = {
  name: "Modo lectura",
  render: () => <WizardSample readOnly />,
};

export const Movil: Story = {
  name: "Móvil",
  globals: MOBILE,
  render: () => <WizardSample />,
};

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => <LayoutMatrix component="WizardLayout" Sample={WizardSample} />,
};
