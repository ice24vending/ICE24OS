/** Joins class names, skipping empty values. */
export const cx = (...parts: readonly unknown[]): string =>
  parts.filter((part): part is string => typeof part === "string" && part !== "").join(" ");

/** Joins `aria-describedby` ids; `undefined` when there is none. */
export const describedBy = (...ids: readonly (string | false | null | undefined)[]) =>
  ids.filter(Boolean).join(" ") || undefined;

/** Status tones of UI_UX §6.3, as named by the `--color-status-*` tokens. */
export type StatusTone = "success" | "warning" | "danger" | "info" | "nodata" | "audit" | "offline";

/** Elements that can take keyboard focus (used by Dialog to trap Tab). */
export const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");
