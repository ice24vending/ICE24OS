import type { Meta, StoryObj } from "@storybook/react-vite";

import { breakpoints, radii, rem, sizes, spacing } from "../tokens/index.js";
import { Page, Section } from "./foundation-kit.js";

const meta = {
  title: "Fundamentos/Espaciado",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Escala: Story = {
  render: () => (
    <Page title="Espaciado" intro="Escala en pasos de 4 px (UI_UX §8.4).">
      <Section title="Espacios">
        {Object.entries(spacing).map(([step, px]) => (
          <div key={step} className="space-row">
            <code>--space-{step}</code>
            <span className="space-row__bar" style={{ width: `var(--space-${step})` }} />
            <span>
              {px} px · {rem(px)}
            </span>
          </div>
        ))}
      </Section>
      <Section title="Área mínima de toque">
        <p>
          Todo control mide al menos {sizes["touch-target"]} × {sizes["touch-target"]} px, también
          en densidad compacta.
        </p>
        <span className="touch-target">44</span>
      </Section>
    </Page>
  ),
};

export const Radios: Story = {
  render: () => (
    <Page title="Radios" intro="Radios moderados: las tarjetas no deben parecer cápsulas.">
      <Section title="Radios">
        <ul className="foundation__grid">
          {Object.entries(radii).map(([name, px]) => (
            <li
              key={name}
              className="radius-sample"
              style={{ borderRadius: `var(--radius-${name})` }}
            >
              <code>--radius-{name}</code>
              <span>{name === "pill" ? "píldora" : `${px} px`}</span>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  ),
};

const BREAKPOINT_USE: Record<keyof typeof breakpoints, string> = {
  xs: "Teléfonos pequeños",
  sm: "Teléfonos grandes",
  md: "Tabletas",
  lg: "Laptop y escritorio",
  xl: "Escritorio amplio",
};

export const Breakpoints: Story = {
  render: () => (
    <Page
      title="Breakpoints"
      intro="Los componentes responden al espacio disponible. Las variables CSS no se pueden leer en @media: las hojas de estilo escriben el valor en rem."
    >
      <Section title="Rangos">
        <table className="foundation-table">
          <caption>UI_UX §16.1</caption>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Desde</th>
              <th scope="col">Media query</th>
              <th scope="col">Uso</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(breakpoints) as (keyof typeof breakpoints)[]).map((name) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                </td>
                <td>{breakpoints[name]} px</td>
                <td>
                  <code>(min-width: {rem(breakpoints[name])})</code>
                </td>
                <td>{BREAKPOINT_USE[name]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </Page>
  ),
};
