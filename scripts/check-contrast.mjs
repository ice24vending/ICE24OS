import { readFile } from "node:fs/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  CONTRAST_PAIRS,
  THRESHOLDS,
  truncatedContrast,
} from "../packages/ui/src/tokens/contrast.ts";

/**
 * WCAG 2.2 AA contrast check of the ICE24 tokens (F6-01). Reads the generated
 * packages/ui/src/tokens/tokens.css, resolves each semantic token to its color and evaluates
 * every foreground/background pair the interface uses.
 *
 *   node scripts/check-contrast.mjs             failures only; exit code 1 on any failure
 *   node scripts/check-contrast.mjs --verbose   every pair with its ratio
 *   node scripts/check-contrast.mjs --markdown  table for docs/design-system/tokens.md
 *
 * The pairs and the WCAG formula live in packages/ui/src/tokens/contrast.ts.
 */

export {
  CONTRAST_PAIRS as PAIRS,
  contrastRatio,
  relativeLuminance,
  THRESHOLDS,
} from "../packages/ui/src/tokens/contrast.ts";

/** Custom properties of the first `:root` block of a stylesheet. */
export const parseRootVariables = (css) => {
  const root = /:root\s*\{([^}]*)\}/.exec(css);
  if (!root) throw new Error("No :root block found");
  const variables = new Map();
  for (const match of root[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    variables.set(match[1], match[2].replace(/\s+/g, " ").trim());
  }
  return variables;
};

/** Resolves `name` (with or without `--color-`) through `var()` chains to a #rrggbb value. */
export const resolveColor = (variables, name) => {
  let key = name.startsWith("--") ? name : `--color-${name}`;
  for (let depth = 0; depth < 10; depth += 1) {
    const value = variables.get(key);
    if (value === undefined) throw new Error(`Unknown token ${key}`);
    const reference = /^var\((--[\w-]+)\)$/.exec(value);
    if (!reference) {
      if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${key} is not an opaque hex color`);
      return value.toUpperCase();
    }
    key = reference[1];
  }
  throw new Error(`Reference cycle at ${name}`);
};

/** Evaluates `pairs`; ratios are truncated (not rounded) to two decimals before comparing. */
export const evaluatePairs = (variables, pairs = CONTRAST_PAIRS) =>
  pairs.map((pair) => {
    const foreground = resolveColor(variables, pair.fg);
    const background = resolveColor(variables, pair.bg);
    const ratio = truncatedContrast(foreground, background);
    const required = THRESHOLDS[pair.kind];
    const meets = ratio >= required;
    return {
      ...pair,
      foreground,
      background,
      ratio,
      required,
      meets,
      ok: pair.forbidden ? !meets : meets,
    };
  });

const KIND_LABEL = { text: "Texto normal", large: "Texto grande", ui: "UI / gráfico" };

export const toMarkdown = (results) =>
  [
    "| Primer plano | Fondo | Uso | Tipo | Razón | Mínimo | Resultado |",
    "| --- | --- | --- | --- | ---: | ---: | --- |",
    ...results.map((result) => {
      const verdict = result.forbidden
        ? result.ok
          ? "No permitido (no cumple)"
          : "**Revisar: ahora cumple**"
        : result.ok
          ? "Cumple"
          : "**No cumple**";
      return `| \`${result.fg}\` ${result.foreground} | \`${result.bg}\` ${result.background} | ${result.usage} | ${KIND_LABEL[result.kind]} | ${result.ratio.toFixed(2)}:1 | ${result.required}:1 | ${verdict} |`;
    }),
  ].join("\n");

const main = async () => {
  const css = await readFile(new URL("../packages/ui/src/tokens/tokens.css", import.meta.url), {
    encoding: "utf8",
  });
  const results = evaluatePairs(parseRootVariables(css));
  if (process.argv.includes("--markdown")) {
    console.info(toMarkdown(results));
  } else {
    const verbose = process.argv.includes("--verbose");
    for (const result of results.filter((item) => verbose || !item.ok)) {
      const mark = result.ok ? "ok  " : "FAIL";
      console.info(
        `${mark} ${result.ratio.toFixed(2).padStart(5)}:1 (min ${result.required}) ${result.fg} on ${result.bg}${result.forbidden ? " [forbidden]" : ""}`,
      );
    }
  }
  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    console.error(`${failures.length} contrast pair(s) failed.`);
    process.exitCode = 1;
  } else if (!process.argv.includes("--markdown")) {
    console.info(`${results.length} contrast pairs checked.`);
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
