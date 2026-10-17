import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { format, resolveConfig } from "prettier";
import { describe, expect, it } from "vitest";

import { renderTokensCss, themeCssVariables } from "./css.js";
import {
  breakpointQueries,
  breakpoints,
  motion,
  spacing,
  typeScale,
  zIndex,
} from "./foundations.js";
import { brandAnchors, primitiveColors } from "./primitives.js";
import { semanticColorRefs, semanticColors } from "./semantic.js";

const tokensCssPath = fileURLToPath(new URL("./tokens.css", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));

const cssFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return cssFiles(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });

describe("brand palette (F6-01)", () => {
  it("keeps the four ICE24 anchors of UI_UX.md §6 unchanged", () => {
    expect(brandAnchors).toEqual({
      "brand-900": "#04144C",
      "brand-600": "#0455C4",
      "brand-300": "#9CD5EF",
      white: "#FFFFFF",
    });
    for (const [name, value] of Object.entries(brandAnchors)) {
      expect(primitiveColors[name as keyof typeof brandAnchors]).toBe(value);
    }
  });

  it("uses opaque #RRGGBB values except for the translucent shades", () => {
    for (const [name, value] of Object.entries(primitiveColors)) {
      if (/-a\d+$/.test(name)) expect(value).toMatch(/^rgb\(\d+ \d+ \d+ \/ \d+%\)$/);
      else expect(value).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});

describe("semantic tokens (F6-02)", () => {
  it("covers every group the design system requires", () => {
    expect(Object.keys(semanticColorRefs)).toEqual([
      "surface",
      "text",
      "border",
      "action",
      "focus",
      "status",
      "overlay",
    ]);
  });

  it("gives every status tone the same four roles", () => {
    const tones = ["success", "warning", "danger", "info", "nodata", "audit", "offline"];
    expect(Object.keys(semanticColorRefs.status).sort()).toEqual(
      tones.flatMap((tone) => ["bg", "border", "emphasis", "fg"].map((r) => `${tone}-${r}`)).sort(),
    );
  });

  it("resolves each semantic token to its primitive value", () => {
    expect(semanticColors.action["primary-bg"]).toBe("#0455C4");
    expect(semanticColors.text.default).toBe(primitiveColors["neutral-900"]);
    expect(semanticColors.overlay.scrim).toBe(primitiveColors["brand-950-a60"]);
  });

  it("never uses light brand shades as text (UI_UX.md §6.5)", () => {
    const light = new Set(["brand-300", "brand-200", "brand-100", "brand-50"]);
    for (const [key, ref] of Object.entries(semanticColorRefs.text)) {
      if (key.startsWith("inverse")) continue;
      expect(light.has(ref), `text.${key}`).toBe(false);
    }
  });
});

describe("foundations", () => {
  it("builds spacing in 4 px steps", () => {
    for (const px of Object.values(spacing)) expect(px % 4).toBe(0);
  });

  it("keeps form text at 16 px or more so phones do not zoom (UI_UX.md §7.2)", () => {
    expect(typeScale["body-md"].sizePx).toBeGreaterThanOrEqual(16);
  });

  it("keeps transitions between 120 and 240 ms (UI_UX.md §8.8)", () => {
    for (const ms of Object.values(motion.duration)) {
      expect(ms).toBeGreaterThanOrEqual(120);
      expect(ms).toBeLessThanOrEqual(240);
    }
  });

  it("orders layers so overlays cover floating panels and the skip link covers all", () => {
    expect(zIndex.overlay).toBeGreaterThan(zIndex.floating);
    expect(zIndex.modal).toBeGreaterThan(zIndex.overlay);
    expect(Math.max(...Object.values(zIndex))).toBe(zIndex["skip-link"]);
  });

  it("exposes breakpoints as ascending rem media queries", () => {
    const values = Object.values(breakpoints);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(breakpointQueries.md).toBe("(min-width: 48rem)");
  });
});

describe("tokens.css", () => {
  it("is in sync with the TypeScript tokens (run pnpm tokens:generate)", async () => {
    const options = await resolveConfig(tokensCssPath);
    const expected = await format(renderTokensCss(), { ...options, parser: "css" });
    expect(readFileSync(tokensCssPath, "utf8")).toBe(expected);
  });

  it("declares each custom property once", () => {
    const names = themeCssVariables().map(([name]) => name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("points semantic colors to primitives instead of repeating values", () => {
    for (const [name, value] of themeCssVariables()) {
      const group = /^--color-([a-z]+)-/.exec(name)?.[1];
      if (group && group in semanticColorRefs) expect(value).toMatch(/^var\(--color-[\w-]+\)$/);
    }
  });

  it("stops every transition under prefers-reduced-motion", () => {
    const css = renderTokensCss();
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    for (const name of Object.keys(motion.duration)) {
      expect(reduced).toContain(`--motion-duration-${name}: 0ms;`);
    }
  });

  it("defines every token the stylesheets of the apps and packages/ui use", () => {
    const defined = new Set(themeCssVariables().map(([name]) => name));
    const roots = ["apps/private-web/src", "apps/public-portal/src", "packages/ui/src"];
    const missing: string[] = [];
    for (const file of roots.flatMap((root) => cssFiles(path.join(repoRoot, root)))) {
      const css = readFileSync(file, "utf8");
      const local = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
      for (const [, name] of css.matchAll(/var\((--[\w-]+)/g)) {
        if (!defined.has(name as `--${string}`) && !local.has(name)) {
          missing.push(`${path.relative(repoRoot, file)}: ${name}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
