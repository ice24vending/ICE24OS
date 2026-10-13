import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  evaluatePairs,
  PAIRS,
  parseRootVariables,
  relativeLuminance,
  resolveColor,
  toMarkdown,
} from "./check-contrast.mjs";

const tokensCss = readFileSync(
  new URL("../packages/ui/src/tokens/tokens.css", import.meta.url),
  "utf8",
);

describe("contrast math (WCAG 2.2)", () => {
  it("matches the reference values of black, white and grey", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 10);
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 10);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#0455C4", "#FFFFFF")).toBe(contrastRatio("#FFFFFF", "#0455C4"));
  });

  it("reproduces the ratios UI_UX.md §6.5 quotes for the brand anchors", () => {
    expect(contrastRatio("#FFFFFF", "#0455C4")).toBeCloseTo(6.8, 1);
    expect(contrastRatio("#04144C", "#FFFFFF")).toBeCloseTo(17.4, 1);
    expect(contrastRatio("#04144C", "#9CD5EF")).toBeCloseTo(10.9, 1);
  });
});

describe("token resolution", () => {
  const variables = parseRootVariables(`
    :root {
      --color-white: #ffffff;
      --color-brand-600: #0455c4;
      --color-action-primary-bg: var(--color-brand-600);
      --color-alias: var(--color-action-primary-bg);
      --color-loop: var(--color-loop);
      --color-scrim: rgb(0 0 0 / 50%);
    }
    @media (prefers-reduced-motion: reduce) { :root { --color-white: #000000; } }
  `);

  it("follows var() chains and reads only the first :root block", () => {
    expect(resolveColor(variables, "alias")).toBe("#0455C4");
    expect(resolveColor(variables, "--color-white")).toBe("#FFFFFF");
  });

  it("rejects unknown tokens, cycles and translucent colors", () => {
    expect(() => resolveColor(variables, "missing")).toThrow(/Unknown token/);
    expect(() => resolveColor(variables, "loop")).toThrow(/cycle/);
    expect(() => resolveColor(variables, "scrim")).toThrow(/opaque/);
  });
});

describe("pair evaluation", () => {
  const variables = parseRootVariables(":root { --color-a: #777777; --color-b: #ffffff; }");

  it("truncates instead of rounding, so 4.48 never passes as 4.5", () => {
    const [result] = evaluatePairs(variables, [{ fg: "a", bg: "b", kind: "text", usage: "" }]);
    expect(result.ratio).toBe(4.47);
    expect(result.ok).toBe(false);
  });

  it("inverts the verdict of forbidden pairs", () => {
    const [ui, text] = evaluatePairs(variables, [
      { fg: "a", bg: "b", kind: "ui", forbidden: true, usage: "" },
      { fg: "a", bg: "b", kind: "text", forbidden: true, usage: "" },
    ]);
    expect(ui.ok).toBe(false);
    expect(text.ok).toBe(true);
  });
});

describe("ICE24 tokens", () => {
  const results = evaluatePairs(parseRootVariables(tokensCss));

  it("meets WCAG 2.2 AA in every pair in use and keeps forbidden pairs below the minimum", () => {
    expect(results.filter((result) => !result.ok)).toEqual([]);
    expect(results).toHaveLength(PAIRS.length);
  });

  it("documents forbidden pairs in the Markdown table", () => {
    const markdown = toMarkdown(results);
    expect(markdown.split("\n")).toHaveLength(PAIRS.length + 2);
    expect(markdown).toContain("No permitido (no cumple)");
    expect(markdown).not.toContain("**No cumple**");
  });
});
