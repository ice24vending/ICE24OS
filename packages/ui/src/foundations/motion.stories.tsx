import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { motion } from "../tokens/index.js";
import { Page, Section } from "./foundation-kit.js";

const meta = {
  title: "Fundamentos/Movimiento",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Duration = keyof typeof motion.duration;

const MotionDemo = () => {
  const [moved, setMoved] = useState(false);
  return (
    <>
      <button
        type="button"
        className="foundation-button"
        aria-pressed={moved}
        onClick={() => setMoved((value) => !value)}
      >
        {moved ? "Regresar" : "Mover"}
      </button>
      {(Object.keys(motion.duration) as Duration[]).map((name) => (
        <div key={name}>
          <p>
            <code>--motion-duration-{name}</code>: {motion.duration[name]} ms con{" "}
            <code>--motion-easing-standard</code>
          </p>
          <div className={`motion-track${moved ? " motion-track--moved" : ""}`}>
            <span
              className="motion-dot"
              aria-hidden="true"
              style={{
                transitionDuration: `var(--motion-duration-${name})`,
                transitionTimingFunction: "var(--motion-easing-standard)",
              }}
            />
          </div>
        </div>
      ))}
    </>
  );
};

export const Duraciones: Story = {
  render: () => (
    <Page
      title="Movimiento"
      intro="Transiciones de 120 a 240 ms. Con «reducir movimiento» activado en el sistema operativo, todas las duraciones pasan a 0 ms y los cambios son instantáneos."
    >
      <Section title="Prueba">
        <MotionDemo />
      </Section>
      <Section title="Curvas">
        <table className="foundation-table">
          <caption>Easing</caption>
          <thead>
            <tr>
              <th scope="col">Token</th>
              <th scope="col">Valor</th>
              <th scope="col">Uso</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>--motion-easing-standard</code>
              </td>
              <td>{motion.easing.standard}</td>
              <td>Cambios dentro de la pantalla</td>
            </tr>
            <tr>
              <td>
                <code>--motion-easing-enter</code>
              </td>
              <td>{motion.easing.enter}</td>
              <td>Elementos que aparecen (menús, avisos)</td>
            </tr>
            <tr>
              <td>
                <code>--motion-easing-exit</code>
              </td>
              <td>{motion.easing.exit}</td>
              <td>Elementos que se retiran</td>
            </tr>
          </tbody>
        </table>
      </Section>
      <Section title="Reglas">
        <ul>
          <li>No se anima información crítica de forma continua.</li>
          <li>Los estados de carga usan skeleton sin movimiento agresivo.</li>
          <li>Sin parallax ni movimiento decorativo en formularios de campo.</li>
        </ul>
      </Section>
    </Page>
  ),
};
