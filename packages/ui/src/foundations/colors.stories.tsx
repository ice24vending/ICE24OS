import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  brandAnchors,
  CONTRAST_PAIRS,
  type PrimitiveColor,
  primitiveColors,
  semanticColorRefs,
  STATUS_TONES,
} from "../tokens/index.js";
import { ContrastTable, Page, Section, Swatch } from "./foundation-kit.js";

const meta = {
  title: "Fundamentos/Colores",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Paleta ICE24 (UI_UX §6) y tokens semánticos (F6-01 y F6-02). Cada combinación muestra su razón de contraste WCAG 2.2, la misma que calcula `pnpm check:contrast`.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const scale = (prefix: string) =>
  (Object.keys(primitiveColors) as PrimitiveColor[]).filter((name) =>
    name.startsWith(`${prefix}-`),
  );

const PrimitiveGrid = ({ names }: { readonly names: readonly PrimitiveColor[] }) => (
  <ul className="foundation__grid">
    {names.map((name) => (
      <Swatch
        key={name}
        name={name}
        cssVar={`--color-${name}`}
        value={primitiveColors[name]}
        note={name in brandAnchors ? "Anclaje de marca ICE24" : undefined}
      />
    ))}
  </ul>
);

export const Marca: Story = {
  render: () => (
    <Page
      title="Colores de marca"
      intro="Azul noche, azul de acción, celeste hielo y blanco son los anclajes tomados de las referencias ICE24; los demás tonos son extensiones de producto."
    >
      <Section title="Escala brand">
        <PrimitiveGrid names={["white", ...scale("brand").filter((n) => !n.includes("-a"))]} />
      </Section>
      <Section title="Neutros">
        <PrimitiveGrid names={scale("neutral").filter((n) => !n.includes("-a"))} />
      </Section>
    </Page>
  ),
};

const TONE_LABEL: Record<(typeof STATUS_TONES)[number], string> = {
  success: "Éxito / conforme",
  warning: "Advertencia",
  danger: "Error / crítico",
  info: "Información",
  nodata: "Sin datos",
  audit: "Auditoría",
  offline: "Sin conexión / local",
};

const TONE_ICON: Record<(typeof STATUS_TONES)[number], string> = {
  success: "✓",
  warning: "!",
  danger: "✕",
  info: "i",
  nodata: "–",
  audit: "◷",
  offline: "⇅",
};

export const Estados: Story = {
  render: () => (
    <Page
      title="Colores de estado"
      intro="El color nunca es la única señal: cada estado lleva texto e icono. Rojo, ámbar y verde no se usan para marca ni navegación."
    >
      {STATUS_TONES.map((tone) => (
        <Section key={tone} title={TONE_LABEL[tone]}>
          <p>
            <span
              className="status-chip"
              style={{
                color: `var(--color-status-${tone}-fg)`,
                background: `var(--color-status-${tone}-bg)`,
                borderColor: `var(--color-status-${tone}-border)`,
              }}
            >
              <span aria-hidden="true">{TONE_ICON[tone]}</span> {TONE_LABEL[tone]}
            </span>
          </p>
          <ul className="foundation__grid">
            {(["fg", "bg", "border", "emphasis"] as const).map((role) => {
              const ref = semanticColorRefs.status[`${tone}-${role}`];
              return (
                <Swatch
                  key={role}
                  name={`status-${tone}-${role}`}
                  cssVar={`--color-status-${tone}-${role}`}
                  value={primitiveColors[ref]}
                  note={ref}
                />
              );
            })}
          </ul>
        </Section>
      ))}
    </Page>
  ),
};

export const Semanticos: Story = {
  name: "Semánticos",
  render: () => (
    <Page
      title="Tokens semánticos"
      intro="Los componentes solo usan estos nombres. Cada uno apunta a un color de la paleta; si la marca ajusta un tono, ningún componente cambia."
    >
      {(Object.keys(semanticColorRefs) as (keyof typeof semanticColorRefs)[])
        .filter((group) => group !== "status")
        .map((group) => (
          <Section key={group} title={group}>
            <ul className="foundation__grid">
              {Object.entries(semanticColorRefs[group]).map(([key, ref]) => (
                <Swatch
                  key={key}
                  name={`${group}-${key}`}
                  cssVar={`--color-${group}-${key}`}
                  value={primitiveColors[ref as PrimitiveColor]}
                  note={ref}
                />
              ))}
            </ul>
          </Section>
        ))}
    </Page>
  ),
};

export const Contraste: Story = {
  render: () => (
    <Page
      title="Contraste WCAG 2.2 AA"
      intro="Texto normal 4.5:1; texto grande, controles, foco e iconos 3:1. Las razones se truncan a dos decimales: 4.499 no cuenta como 4.5."
    >
      <Section title="Combinaciones en uso">
        <ContrastTable
          caption="Todas deben cumplir"
          pairs={CONTRAST_PAIRS.filter((pair) => !pair.forbidden)}
        />
      </Section>
      <Section title="Combinaciones no permitidas">
        <ContrastTable
          caption="No alcanzan el mínimo: no se usan así"
          pairs={CONTRAST_PAIRS.filter((pair) => pair.forbidden)}
        />
      </Section>
    </Page>
  ),
};
