import { describe, expect, it } from "vitest";

import { findColorLiterals } from "./check-color-literals.mjs";

const lines = (source, extension) =>
  findColorLiterals(source, extension).map((finding) => finding.line);

describe("color literal detection", () => {
  it("flags hex, color functions and named colors in CSS values", () => {
    const css = [
      ".a {",
      "  color: #fff;",
      "  background: rgb(20 37 54 / 60%);",
      "  border-color: white;",
      "  box-shadow: 0 0 1rem hsl(0 0% 0%);",
      "  background: linear-gradient(#062d52, var(--color-surface-canvas));",
      "}",
    ].join("\n");
    expect(lines(css, ".css")).toEqual([2, 3, 4, 5, 6]);
  });

  it("flags fallbacks hidden inside var()", () => {
    expect(lines(".a {\n  color: var(--color-status-danger-fg, #9b1c1c);\n}", ".css")).toEqual([2]);
  });

  it("accepts tokens, id selectors, comments and token names that contain color words", () => {
    const css = [
      "/* Old value was #0758a8 */",
      "#add, .x {",
      "  color: var(--color-text-inverse);",
      "  background: var(--color-white);",
      "  outline: var(--size-focus-ring-width) solid var(--color-focus-ring);",
      "  white-space: nowrap;",
      "}",
    ].join("\n");
    expect(lines(css, ".css")).toEqual([]);
  });

  it("flags quoted colors in TypeScript but not anchors or ids", () => {
    const ts = [
      'export const theme = "#0b5cab";',
      "const shade = 'rgb(0 0 0 / 10%)';",
      'const href = "#main-content";',
      'const id = "#details";',
    ].join("\n");
    expect(lines(ts, ".ts")).toEqual([1, 2]);
  });
});
