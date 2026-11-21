import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";
import { ViewSwitcher, type CollectionView } from "./view-switcher.js";

function Example({
  disabled = false,
  initial = "lista",
}: {
  disabled?: boolean;
  initial?: CollectionView;
}) {
  const [value, setValue] = useState<CollectionView>(initial);
  return <ViewSwitcher value={value} onChange={setValue} disabled={disabled} />;
}

const meta = {
  title: "Base/Alternador de vista",
  component: ViewSwitcher,
  parameters: {
    docs: {
      description: {
        component: componentDocs({
          summary:
            "Elección segmentada Lista | Bloques con radios nativos. El adaptador de la pantalla conserva la URL y su preferencia de vista.",
          use: ["Dos presentaciones del mismo conjunto de registros."],
          avoid: ["Usarlo como navegación entre módulos o como pestañas de contenido distinto."],
          accessibility: [
            "Tab entra a la opción seleccionada; las flechas cambian la opción y el foco.",
            "Un solo anuncio por cambio de la persona; sin anuncio inicial ni al restaurar una preferencia.",
          ],
          copy: ["Lista", "Bloques", "Vista de los registros"],
        }),
      },
    },
  },
} satisfies Meta<typeof ViewSwitcher>;

export default meta;
// Samples own their controlled state rather than accepting Storybook args.
type Story = StoryObj;

export const Normal: Story = { render: () => <Example /> };
export const Bloques: Story = { render: () => <Example initial="bloques" /> };
export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="ViewSwitcher"
      cells={{
        normal: <Example />,
        loading: <Example disabled />,
        empty: <Example />,
        error: na("el error de los registros se presenta en su panel de estado."),
        forbidden: na(
          "la pantalla oculta registros sin permiso; la preferencia no concede acceso.",
        ),
        readonly: <Example initial="bloques" />,
        disabled: <Example disabled />,
        focus: <Example />,
      }}
    />
  ),
};
