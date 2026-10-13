import type { Meta, StoryObj } from "@storybook/react-vite";

import { elevation, zIndex } from "../tokens/index.js";
import { Page, Section } from "./foundation-kit.js";

const meta = {
  title: "Fundamentos/Elevación",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const USE: Record<keyof typeof elevation, string> = {
  none: "Tarjetas sobre fondo blanco: se separan con borde",
  sm: "Superficies apenas elevadas",
  md: "Tarjetas sobre el fondo general y paneles flotantes",
  lg: "Modales, menús y la tarjeta de acceso",
};

export const Sombras: Story = {
  render: () => (
    <Page
      title="Elevación"
      intro="Las sombras solo expresan elevación real (menús, modales, navegación flotante) y nunca son la única separación: toda superficie conserva su borde."
    >
      <Section title="Niveles">
        <div className="elevation-stage">
          <ul className="foundation__grid">
            {(Object.keys(elevation) as (keyof typeof elevation)[]).map((name) => (
              <li
                key={name}
                className="elevation-sample"
                style={{ boxShadow: `var(--shadow-${name})`, borderRadius: "var(--radius-lg)" }}
              >
                <code>--shadow-{name}</code>
                <span>{USE[name]}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>
      <Section title="Capas (z-index)">
        <table className="foundation-table">
          <caption>Una capa más alta siempre cubre a una más baja</caption>
          <thead>
            <tr>
              <th scope="col">Token</th>
              <th scope="col">Valor</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(zIndex).map(([name, value]) => (
              <tr key={name}>
                <td>
                  <code>--z-{name}</code>
                </td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </Page>
  ),
};
