/**
 * WCAG 2.2 contrast math and the token pairs ICE24 OS uses (F6-01). Dependency-free so that
 * `scripts/check-contrast.mjs` can import it directly with Node's type stripping and the
 * Storybook foundations show the same ratios the check enforces.
 */

export const THRESHOLDS = {
  /** Normal text, 1.4.3. */
  text: 4.5,
  /** Large text (24 px, or 18.66 px bold), 1.4.3. */
  large: 3,
  /** Controls, focus indicators and meaningful graphics, 1.4.11. */
  ui: 3,
} as const;

export type ContrastKind = keyof typeof THRESHOLDS;

export interface ContrastPair {
  /** Token name without `--color-`, e.g. `text-default` or `brand-300`. */
  readonly fg: string;
  readonly bg: string;
  readonly kind: ContrastKind;
  readonly usage: string;
  readonly forbidden?: boolean;
}

export const STATUS_TONES = [
  "success",
  "warning",
  "danger",
  "info",
  "nodata",
  "audit",
  "offline",
] as const;

/** One pair per background: `fg` over each token of `backgrounds`. */
const over = (
  fg: string,
  backgrounds: readonly string[],
  kind: ContrastKind,
  usage: string,
): ContrastPair[] => backgrounds.map((bg) => ({ fg, bg, kind, usage }));

/** A combination the palette must not be used for (documented, and checked to stay failing). */
const forbidden = (fg: string, bg: string, kind: ContrastKind, usage: string): ContrastPair => ({
  fg,
  bg,
  kind,
  usage,
  forbidden: true,
});

/**
 * Pairs in use. `kind` picks the threshold. The check also fails if a forbidden pair ever starts
 * to pass unnoticed, because the documentation would then be wrong.
 */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  ...over(
    "text-default",
    [
      "surface-default",
      "surface-canvas",
      "surface-subtle",
      "surface-selected",
      "surface-brand-subtle",
      "surface-highlight",
    ],
    "text",
    "Texto principal",
  ),
  ...over("text-strong", ["surface-default"], "text", "Texto de máxima jerarquía"),
  ...over(
    "text-muted",
    ["surface-default", "surface-canvas", "surface-subtle", "surface-selected"],
    "text",
    "Texto auxiliar y metadatos",
  ),
  ...over("text-placeholder", ["surface-default"], "text", "Placeholder"),
  ...over(
    "text-brand",
    ["surface-default", "surface-highlight", "surface-brand-subtle"],
    "text",
    "Texto de marca y encabezados",
  ),
  ...over(
    "text-link",
    [
      "surface-default",
      "surface-canvas",
      "surface-subtle",
      "surface-selected",
      "surface-brand-subtle",
    ],
    "text",
    "Enlaces y acentos de acción",
  ),
  ...over("text-link-hover", ["surface-default"], "text", "Enlace en hover"),
  ...over("text-inverse", ["surface-brand"], "text", "Texto sobre azul noche"),
  ...over("text-inverse", ["surface-brand-accent"], "text", "Texto sobre azul de acción"),
  ...over("text-inverse", ["surface-inverse"], "text", "Aviso oscuro (sin conexión)"),
  ...over("text-inverse-muted", ["surface-brand"], "text", "Texto secundario sobre azul noche"),
  ...over(
    "action-primary-fg",
    ["action-primary-bg", "action-primary-bg-hover", "action-primary-bg-active"],
    "text",
    "Botón primario",
  ),
  ...over(
    "action-secondary-fg",
    ["action-secondary-bg", "action-secondary-bg-hover"],
    "text",
    "Botón secundario",
  ),
  ...over(
    "action-danger-fg",
    ["action-danger-bg", "action-danger-bg-hover"],
    "text",
    "Botón destructivo",
  ),
  ...STATUS_TONES.flatMap((tone) => [
    ...over(`status-${tone}-fg`, [`status-${tone}-bg`], "text", "Aviso o chip"),
    ...over(`status-${tone}-fg`, ["surface-default"], "text", "Estado en tabla"),
    ...over("text-inverse", [`status-${tone}-emphasis`], "text", "Insignia sólida"),
    ...over(`status-${tone}-emphasis`, ["surface-default"], "ui", "Franja e icono de estado"),
  ]),
  ...over("border-control", ["surface-default", "surface-canvas"], "ui", "Borde de campo"),
  ...over("border-selected", ["surface-default"], "ui", "Elemento seleccionado"),
  ...over("action-primary-bg", ["surface-default"], "ui", "Límite de botón"),
  ...over("action-secondary-border", ["surface-default"], "ui", "Límite de botón"),
  ...over(
    "focus-ring",
    ["surface-default", "surface-canvas", "surface-subtle", "surface-selected"],
    "ui",
    "Anillo de foco",
  ),
  ...over("focus-ring-inverse", ["surface-brand"], "ui", "Foco sobre azul noche"),
  forbidden("brand-300", "white", "ui", "Celeste hielo como texto, icono o borde"),
  forbidden("brand-400", "white", "ui", "Foco brand-400 sobre blanco (UI_UX §8.6)"),
  forbidden("brand-500", "white", "text", "brand-500 como texto normal"),
  forbidden("neutral-500", "white", "text", "neutral-500 como placeholder (UI_UX §6.2)"),
  forbidden("neutral-400", "white", "ui", "neutral-400 como borde de control"),
  forbidden("border-default", "surface-default", "ui", "Borde decorativo como límite de control"),
];

const channel = (value: number): number => {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.x relative luminance of a #rrggbb color. */
export const relativeLuminance = (hex: string): number => {
  const component = (index: number) => channel(parseInt(hex.slice(index, index + 2), 16));
  return 0.2126 * component(1) + 0.7152 * component(3) + 0.0722 * component(5);
};

export const contrastRatio = (foreground: string, background: string): number => {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

/** Ratio truncated (not rounded) to two decimals, so 4.499 never passes as 4.5. */
export const truncatedContrast = (foreground: string, background: string): number =>
  Math.floor(contrastRatio(foreground, background) * 100) / 100;
