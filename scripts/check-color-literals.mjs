import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

/**
 * Fails when a stylesheet or component writes a color literal instead of a token (F6-02,
 * PROJECT_RULES §11). Colors are defined only in packages/ui/src/tokens.
 */

export const SCANNED_ROOTS = ["apps/private-web/src", "apps/public-portal/src", "packages/ui/src"];
export const ALLOWED_ROOTS = ["packages/ui/src/tokens"];

const COLOR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const NAMED_COLOR = /(?<![-\w])(?:white|black)(?![-\w])/i;
const CSS_HEX = /#[0-9a-f]{3,8}(?![-\w])/i;
const SCRIPT_HEX = /["'`]#[0-9a-f]{3,8}["'`]/i;

const stripCssComments = (css) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));

/** Color literals of one file as `{ line, text }`. */
export const findColorLiterals = (source, extension) => {
  const findings = [];
  if (extension === ".css") {
    const lines = stripCssComments(source).split("\n");
    lines.forEach((line, index) => {
      const declaration = /^\s*(--[\w-]+|[a-z-]+)\s*:(.*)$/i.exec(line);
      const value = declaration ? declaration[2] : /^\s+[^{}]*;?\s*$/.test(line) ? line : "";
      if (CSS_HEX.test(value) || COLOR_FUNCTION.test(value) || NAMED_COLOR.test(value)) {
        findings.push({ line: index + 1, text: line.trim() });
      }
    });
  } else {
    source.split("\n").forEach((line, index) => {
      if (SCRIPT_HEX.test(line) || /["'`]\s*(?:rgba?|hsla?)\(/i.test(line)) {
        findings.push({ line: index + 1, text: line.trim() });
      }
    });
  }
  return findings;
};

const isScanned = (file) => /\.(css|tsx?)$/.test(file) && !/\.(test|stories)\.tsx?$/.test(file);

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.posix.join(directory, entry.name);
      if (entry.isDirectory()) return walk(full);
      return isScanned(full) ? [full] : [];
    }),
  );
  return files.flat();
};

const main = async () => {
  const files = (await Promise.all(SCANNED_ROOTS.map(walk)))
    .flat()
    .filter((file) => !ALLOWED_ROOTS.some((root) => file.startsWith(`${root}/`)));
  let total = 0;
  for (const file of files) {
    const findings = findColorLiterals(await readFile(file, "utf8"), path.extname(file));
    for (const finding of findings) {
      console.error(`${file}:${finding.line}  ${finding.text}`);
    }
    total += findings.length;
  }
  if (total > 0) {
    console.error(
      `${total} color literal(s) outside packages/ui/src/tokens. Use a semantic token (var(--color-…)) instead.`,
    );
    process.exitCode = 1;
  } else {
    console.info(`No color literals in ${files.length} files.`);
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
