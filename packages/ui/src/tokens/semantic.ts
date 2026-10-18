import { type PrimitiveColor, primitiveColors } from "./primitives.js";

/**
 * Semantic color tokens: what a color is for, not what it looks like. Each one points to a
 * primitive, so a brand adjustment changes the palette without touching components. Only the
 * light theme exists: dark mode is an open question in UI_UX.md §34 (question 8).
 *
 * Contrast of every text/background and control/background pair actually used is checked by
 * `scripts/check-contrast.mjs` and recorded in docs/design-system/tokens.md.
 */
export const semanticColorRefs = {
  surface: {
    canvas: "neutral-50",
    default: "white",
    subtle: "neutral-100",
    raised: "white",
    selected: "brand-100",
    "brand-subtle": "brand-50",
    highlight: "brand-300",
    brand: "brand-900",
    // Hover and current destination of the navigation on brand-900 (F6-03, UI_UX §10.1).
    "brand-hover": "brand-800",
    "brand-accent": "brand-600",
    inverse: "neutral-900",
  },
  text: {
    default: "neutral-900",
    strong: "neutral-950",
    muted: "neutral-600",
    placeholder: "neutral-600",
    disabled: "neutral-500",
    brand: "brand-900",
    link: "brand-600",
    "link-hover": "brand-700",
    inverse: "white",
    "inverse-muted": "brand-200",
  },
  border: {
    subtle: "neutral-200",
    default: "neutral-300",
    control: "neutral-500",
    brand: "brand-300",
    "brand-strong": "brand-900",
    selected: "brand-600",
    // Shape that marks the current destination on brand-900 (UI_UX §10.1).
    "brand-indicator": "brand-400",
  },
  action: {
    "primary-bg": "brand-600",
    "primary-bg-hover": "brand-700",
    "primary-bg-active": "brand-800",
    "primary-fg": "white",
    "secondary-bg": "white",
    "secondary-bg-hover": "brand-50",
    "secondary-fg": "brand-600",
    "secondary-border": "brand-600",
    "danger-bg": "danger-700",
    "danger-bg-hover": "danger-800",
    "danger-fg": "white",
    "disabled-bg": "neutral-100",
    "disabled-fg": "neutral-500",
    "disabled-border": "neutral-300",
  },
  focus: {
    // UI_UX.md §8.6 proposes brand-400, which reaches only 2.7:1 on white (ADR-025).
    ring: "brand-600",
    "ring-inverse": "brand-400",
  },
  status: {
    "success-fg": "success-700",
    "success-bg": "success-50",
    "success-border": "success-200",
    "success-emphasis": "success-700",
    "warning-fg": "warning-700",
    "warning-bg": "warning-50",
    "warning-border": "warning-200",
    "warning-emphasis": "warning-700",
    "danger-fg": "danger-700",
    "danger-bg": "danger-50",
    "danger-border": "danger-200",
    "danger-emphasis": "danger-700",
    "info-fg": "info-700",
    "info-bg": "info-50",
    "info-border": "info-200",
    "info-emphasis": "info-700",
    "nodata-fg": "nodata-700",
    "nodata-bg": "nodata-50",
    "nodata-border": "nodata-200",
    "nodata-emphasis": "nodata-700",
    "audit-fg": "audit-700",
    "audit-bg": "audit-50",
    "audit-border": "audit-200",
    "audit-emphasis": "audit-700",
    "offline-fg": "offline-700",
    "offline-bg": "offline-50",
    "offline-border": "offline-200",
    "offline-emphasis": "offline-700",
  },
  overlay: {
    scrim: "brand-950-a60",
    "shadow-soft": "neutral-950-a8",
    "shadow-strong": "neutral-950-a14",
  },
} as const satisfies Record<string, Record<string, PrimitiveColor>>;

type SemanticRefs = typeof semanticColorRefs;
export type SemanticColorGroup = keyof SemanticRefs;

export type SemanticColors = {
  readonly [G in SemanticColorGroup]: {
    readonly [K in keyof SemanticRefs[G]]: string;
  };
};

/** Semantic tokens resolved to their color value, for code that cannot use CSS variables. */
export const semanticColors = Object.fromEntries(
  Object.entries(semanticColorRefs).map(([group, refs]) => [
    group,
    Object.fromEntries(
      Object.entries(refs).map(([key, ref]) => [key, primitiveColors[ref as PrimitiveColor]]),
    ),
  ]),
) as SemanticColors;
