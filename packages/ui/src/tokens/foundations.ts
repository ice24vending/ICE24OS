import { primitiveColors } from "./primitives.js";

/** Root font size the rem conversions assume (browser default). */
export const ROOT_FONT_SIZE_PX = 16;

export const rem = (px: number): string => `${px / ROOT_FONT_SIZE_PX}rem`;

/**
 * Montserrat approximates the geometric sans of the ICE24 references until the official brand
 * font is delivered (UI_UX.md §7). It is not bundled: without it the stack falls back to the
 * system font.
 */
export const fontFamilies = {
  sans: 'Montserrat, Inter, system-ui, "Segoe UI", Roboto, Arial, sans-serif',
  mono: 'ui-monospace, "Cascadia Mono", "SFMono-Regular", Menlo, Consolas, monospace',
} as const;

export interface TypeStyle {
  readonly family: keyof typeof fontFamilies;
  readonly sizePx: number;
  readonly lineHeightPx: number;
  readonly weight: number;
}

/** Type scale of UI_UX.md §7.1. */
export const typeScale = {
  "display-lg": { family: "sans", sizePx: 48, lineHeightPx: 56, weight: 800 },
  "display-sm": { family: "sans", sizePx: 36, lineHeightPx: 44, weight: 800 },
  "heading-1": { family: "sans", sizePx: 30, lineHeightPx: 38, weight: 800 },
  "heading-2": { family: "sans", sizePx: 24, lineHeightPx: 32, weight: 700 },
  "heading-3": { family: "sans", sizePx: 20, lineHeightPx: 28, weight: 700 },
  "heading-4": { family: "sans", sizePx: 18, lineHeightPx: 26, weight: 600 },
  "body-lg": { family: "sans", sizePx: 18, lineHeightPx: 28, weight: 400 },
  "body-md": { family: "sans", sizePx: 16, lineHeightPx: 24, weight: 400 },
  "body-sm": { family: "sans", sizePx: 14, lineHeightPx: 20, weight: 400 },
  "label-md": { family: "sans", sizePx: 14, lineHeightPx: 20, weight: 600 },
  "label-sm": { family: "sans", sizePx: 12, lineHeightPx: 16, weight: 600 },
  caption: { family: "sans", sizePx: 12, lineHeightPx: 16, weight: 400 },
  mono: { family: "mono", sizePx: 13, lineHeightPx: 20, weight: 500 },
} as const satisfies Record<string, TypeStyle>;

export type TypeStyleName = keyof typeof typeScale;

/** Spacing scale in 4 px steps (UI_UX.md §8.4), in px. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** Corner radii (UI_UX.md §8.5), in px. */
export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

/** Border widths and sizes that keep controls usable (UI_UX.md §8.6 and §16.2). */
export const sizes = {
  "border-default": 1,
  "border-strong": 2,
  "focus-ring-width": 3,
  "focus-ring-offset": 2,
  "touch-target": 44,
} as const;

/**
 * Elevation (UI_UX.md §8.6): shadows only for surfaces that really float. Cards on a white
 * background separate with a border or a secondary background, not with a shadow.
 */
export const elevation = {
  none: "none",
  sm: `0 ${rem(1)} ${rem(3)} ${primitiveColors["neutral-950-a8"]}`,
  md: `0 ${rem(4)} ${rem(16)} ${primitiveColors["neutral-950-a8"]}`,
  lg: `0 ${rem(16)} ${rem(48)} ${primitiveColors["neutral-950-a14"]}`,
} as const;

/**
 * Motion (UI_UX.md §8.8): 120–240 ms transitions. Under `prefers-reduced-motion: reduce` every
 * duration becomes 0 ms, so components that use these tokens stop animating without extra code.
 */
export const motion = {
  duration: { fast: 120, base: 180, slow: 240 },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    enter: "cubic-bezier(0, 0, 0, 1)",
    exit: "cubic-bezier(0.3, 0, 1, 1)",
  },
} as const;

/** Stacking order. A higher layer always covers a lower one. */
export const zIndex = {
  base: 0,
  raised: 10,
  sticky: 100,
  header: 200,
  dropdown: 300,
  floating: 400,
  overlay: 500,
  modal: 510,
  toast: 600,
  "skip-link": 700,
} as const;

/**
 * Breakpoints (UI_UX.md §16.1): minimum width of each range, in px. CSS custom properties cannot
 * be read inside `@media`, so stylesheets write the rem value (`breakpointQueries`).
 */
export const breakpoints = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1440,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export const breakpointQueries = Object.fromEntries(
  Object.entries(breakpoints).map(([name, px]) => [name, `(min-width: ${rem(px)})`]),
) as Record<Breakpoint, string>;
