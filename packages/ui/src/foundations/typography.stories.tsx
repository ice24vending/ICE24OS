import type { Meta, StoryObj } from "@storybook/react-vite";

import { fontFamilies, type TypeStyleName, typeScale } from "../tokens/index.js";
import { Page, Section } from "./foundation-kit.js";

const meta = {
  title: "Fundamentos/Tipografía",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const SAMPLES: Partial<Record<TypeStyleName, string>> = {
  "display-lg": "Hielo y agua confiables",
  "display-sm": "Equipos y mantenimiento",
  "heading-1": "Orden de trabajo OT-00241",
  "heading-2": "Mantenimiento preventivo",
  "heading-3": "Máquina despachadora 03",
  "heading-4": "Historial de servicio",
  "body-lg": "La cuenta quedó en modo lectura porque el último pago fue rechazado.",
  "body-md": "Registra la evidencia del muestreo; se enviará cuando vuelva la conexión.",
  "body-sm": "Actualizado el 12/10/2026 a las 09:41 por Técnico de sucursal.",
  "label-md": "Guardar cambios",
  "label-sm": "Atención preventiva",
  caption: "Versión 3 · hace 2 minutos",
  mono: "ICE-MX-000241 · 7f3a9c1e",
};

export const Escala: Story = {
  render: () => (
    <Page
      title="Escala tipográfica"
      intro="Montserrat aproxima la sans geométrica de las referencias ICE24 hasta recibir la tipografía oficial. No se distribuye todavía: si no está instalada, se usa la fuente del sistema."
    >
      <Section title="Estilos">
        {(Object.keys(typeScale) as TypeStyleName[]).map((name) => {
          const style = typeScale[name];
          return (
            <div key={name} className="type-sample">
              <span style={{ font: `var(--font-${name})` }}>{SAMPLES[name] ?? name}</span>
              <span className="type-sample__meta">
                <code>{name}</code> · {style.sizePx}/{style.lineHeightPx} px · peso {style.weight} ·{" "}
                <code>var(--font-{name})</code>
              </span>
            </div>
          );
        })}
      </Section>
      <Section title="Familias">
        <table className="foundation-table">
          <caption>Pilas de fuentes</caption>
          <thead>
            <tr>
              <th scope="col">Token</th>
              <th scope="col">Valor</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(fontFamilies).map(([name, value]) => (
              <tr key={name}>
                <td>
                  <code>--font-family-{name}</code>
                </td>
                <td style={{ fontFamily: value }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </Page>
  ),
};
