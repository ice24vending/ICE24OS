/**
 * Primitive color palette of the ICE24 Design System (UI_UX.md §6). Provisional, not for
 * production, until brand approval (ADR-025). Components never use primitives directly: they
 * consume the semantic tokens in `semantic.ts`.
 *
 * Brand anchors taken from the ICE24 references and not to be replaced: brand-900, brand-600,
 * brand-300 and white. The `-800` status shades are product extensions (hover and pressed).
 */
export const primitiveColors = {
  white: "#FFFFFF",

  "brand-950": "#020A26",
  "brand-900": "#04144C",
  "brand-800": "#06226F",
  "brand-700": "#033B97",
  "brand-600": "#0455C4",
  "brand-500": "#0878DD",
  "brand-400": "#35A6E8",
  "brand-300": "#9CD5EF",
  "brand-200": "#C5E8F8",
  "brand-100": "#E4F5FD",
  "brand-50": "#F4FBFE",

  "neutral-950": "#101820",
  "neutral-900": "#17212B",
  "neutral-800": "#25313D",
  "neutral-700": "#3A4754",
  "neutral-600": "#556270",
  "neutral-500": "#71808F",
  "neutral-400": "#94A0AC",
  "neutral-300": "#C2CAD2",
  "neutral-200": "#DDE2E7",
  "neutral-100": "#EDF0F3",
  "neutral-50": "#F7F9FA",

  "success-800": "#10603D",
  "success-700": "#16794D",
  "success-200": "#A8DBC2",
  "success-50": "#E8F6EF",

  "warning-800": "#7F4900",
  "warning-700": "#A15C00",
  "warning-200": "#F1CF89",
  "warning-50": "#FFF4DB",

  "danger-800": "#8F1C13",
  "danger-700": "#B42318",
  "danger-200": "#F5B7B1",
  "danger-50": "#FDECEA",

  "info-800": "#125486",
  "info-700": "#1769AA",
  "info-200": "#B5D7F0",
  "info-50": "#EAF4FC",

  "nodata-700": "#59636E",
  "nodata-200": "#D3D8DE",
  "nodata-50": "#F1F3F5",

  "audit-700": "#6E46A5",
  "audit-200": "#D7C3EB",
  "audit-50": "#F3ECFA",

  "offline-700": "#007B83",
  "offline-200": "#A8DCDD",
  "offline-50": "#E4F6F7",

  // Translucent shades for scrims and shadows; never used for text.
  "brand-950-a60": "rgb(2 10 38 / 60%)",
  "neutral-950-a8": "rgb(16 24 32 / 8%)",
  "neutral-950-a14": "rgb(16 24 32 / 14%)",
} as const;

export type PrimitiveColor = keyof typeof primitiveColors;

/** The four anchors observed in the ICE24 references (UI_UX.md §6). */
export const brandAnchors = {
  "brand-900": "#04144C",
  "brand-600": "#0455C4",
  "brand-300": "#9CD5EF",
  white: "#FFFFFF",
} as const satisfies Partial<Record<PrimitiveColor, string>>;
