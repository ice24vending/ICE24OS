/**
 * Building blocks of the "Fundamentos" Storybook pages (F6-02). They render the tokens of
 * packages/ui/src/tokens for review; they are not product components and are not part of the
 * @ice24/ui build.
 */
import type { ReactNode } from "react";

import {
  type ContrastPair,
  type PrimitiveColor,
  primitiveColors,
  type SemanticColorGroup,
  semanticColors,
  THRESHOLDS,
  truncatedContrast,
} from "../tokens/index.js";
import "./foundations.css";

const KIND_LABEL = { text: "Texto normal", large: "Texto grande", ui: "Control o gráfico" };

/** Value of a token named like the contrast pairs: `brand-300` or `text-default`. */
export const tokenValue = (name: string): string => {
  if (name in primitiveColors) return primitiveColors[name as PrimitiveColor];
  const [group, ...rest] = name.split("-");
  const colors = semanticColors[group as SemanticColorGroup] as Record<string, string> | undefined;
  const value = colors?.[rest.join("-")];
  if (!value) throw new Error(`Unknown color token ${name}`);
  return value;
};

export const Page = ({
  title,
  intro,
  children,
}: {
  readonly title: string;
  readonly intro: ReactNode;
  readonly children: ReactNode;
}) => (
  <div className="foundation">
    <h1 className="foundation__title">{title}</h1>
    <p className="foundation__intro">{intro}</p>
    <p className="foundation__provisional" role="note">
      Paleta aprobada por Dirección el 15/10/2026 (ADR-025). Tipografía provisional hasta recibir la
      fuente oficial.
    </p>
    {children}
  </div>
);

export const Section = ({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) => (
  <section className="foundation__section" aria-label={title}>
    <h2>{title}</h2>
    {children}
  </section>
);

export const Swatch = ({
  name,
  cssVar,
  value,
  note,
}: {
  readonly name: string;
  readonly cssVar: string;
  readonly value: string;
  readonly note?: string | undefined;
}) => (
  <li className="swatch">
    <span className="swatch__chip" style={{ background: `var(${cssVar})` }} aria-hidden="true" />
    <span className="swatch__name">{name}</span>
    <code className="swatch__value">{value}</code>
    <code className="swatch__var">{cssVar}</code>
    {note ? <span className="swatch__note">{note}</span> : null}
  </li>
);

/** A foreground/background pair rendered for real, with its WCAG ratio and verdict. */
export const ContrastRow = ({ pair }: { readonly pair: ContrastPair }) => {
  const foreground = tokenValue(pair.fg);
  const background = tokenValue(pair.bg);
  const ratio = truncatedContrast(foreground, background);
  const required = THRESHOLDS[pair.kind];
  const meets = ratio >= required;
  const verdict = pair.forbidden ? "No permitido" : meets ? "Cumple" : "No cumple";
  const tone = pair.forbidden ? "forbidden" : meets ? "pass" : "fail";
  return (
    <tr>
      <td>
        <span
          className={`contrast-sample contrast-sample--${pair.kind}`}
          style={{
            color: foreground,
            background,
            ...(pair.kind === "ui" ? { borderColor: foreground } : {}),
          }}
        >
          {pair.kind === "ui" ? "Control" : "Aa Texto de ejemplo"}
        </span>
      </td>
      <td>
        <code>{pair.fg}</code>
        <br />
        sobre <code>{pair.bg}</code>
      </td>
      <td>{pair.usage}</td>
      <td>{KIND_LABEL[pair.kind]}</td>
      <td className="contrast-ratio">
        <strong>{ratio.toFixed(2)}:1</strong>
        <br />
        mínimo {required}:1
      </td>
      <td>
        <span className={`verdict verdict--${tone}`}>
          <span aria-hidden="true">{tone === "pass" ? "✓" : "✕"}</span> {verdict}
        </span>
      </td>
    </tr>
  );
};

export const ContrastTable = ({
  pairs,
  caption,
}: {
  readonly pairs: readonly ContrastPair[];
  readonly caption: string;
}) => (
  <div className="foundation__table-wrap">
    <table className="contrast-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Muestra</th>
          <th scope="col">Tokens</th>
          <th scope="col">Uso</th>
          <th scope="col">Tipo</th>
          <th scope="col">Razón</th>
          <th scope="col">Resultado</th>
        </tr>
      </thead>
      <tbody>
        {pairs.map((pair) => (
          <ContrastRow key={`${pair.fg}|${pair.bg}|${pair.usage}`} pair={pair} />
        ))}
      </tbody>
    </table>
  </div>
);
