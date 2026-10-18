import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

/**
 * Fails when a component exported by @ice24/ui has no Storybook story or no unit test, or when a
 * component stories file lacks its state matrix (F6-05). Keeps the catalog the single place
 * where every component can be reviewed.
 */

export const UI_SRC = "packages/ui/src";
/** Story export that renders every state of a component family in one view. */
export const MATRIX_EXPORT = "MatrizDeEstados";
/** Stories files that document components (not foundations, patterns or screens). */
export const COMPONENT_STORIES =
  /^packages\/ui\/src\/(components\/[^/]+\/[^/]+|status-panel)\.stories\.tsx$/;

const RE_EXPORT_ALL = /export\s+\*\s+from\s+["'](\.[^"']+)["']/g;
/** PascalCase function or const: components (UPPER_CASE constants are data, not components). */
const COMPONENT_EXPORT =
  /export\s+(?:function\s+([A-Z][A-Za-z0-9]*)\s*[<(]|const\s+([A-Z][a-z][A-Za-z0-9]*)\s*=)/g;

/** Component names exported by one module's source. */
export const componentExports = (source) =>
  [...source.matchAll(COMPONENT_EXPORT)].map((match) => match[1] ?? match[2]);

/** A component counts as used when it is rendered (`<Name`) or named as the story component. */
export const usesComponent = (source, name) =>
  new RegExp(`<${name}[\\s/>]|component:\\s*${name}\\b`).test(source);

/**
 * Gaps of the catalog: components without story or test, and component stories files without
 * the state matrix. `stories` and `tests` map file path → source.
 */
export const findCatalogGaps = ({ components, stories, tests }) => {
  const gaps = [];
  for (const name of components) {
    if (!Object.values(stories).some((source) => usesComponent(source, name)))
      gaps.push(`${name}: sin historia en Storybook`);
    if (!Object.values(tests).some((source) => usesComponent(source, name)))
      gaps.push(`${name}: sin prueba unitaria`);
  }
  for (const [file, source] of Object.entries(stories))
    if (
      COMPONENT_STORIES.test(file) &&
      !new RegExp(`export const ${MATRIX_EXPORT}\\b`).test(source)
    )
      gaps.push(`${file}: falta la historia «Matriz de estados» (${MATRIX_EXPORT})`);
  return gaps;
};

const resolveModule = (from, specifier) => {
  const base = path.posix.join(path.posix.dirname(from), specifier.replace(/\.js$/, ""));
  return [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((file) => existsSync(file));
};

/** Follows `export * from` chains from the package entry and collects component names. */
const exportedComponents = async (entry) => {
  const seen = new Set();
  const names = new Set();
  const visit = async (file) => {
    if (!file || seen.has(file)) return;
    seen.add(file);
    const source = await readFile(file, "utf8");
    for (const name of componentExports(source)) names.add(name);
    for (const match of source.matchAll(RE_EXPORT_ALL)) await visit(resolveModule(file, match[1]));
  };
  await visit(entry);
  return [...names].sort();
};

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.posix.join(directory, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    }),
  );
  return files.flat();
};

const read = async (files) =>
  Object.fromEntries(
    await Promise.all(files.map(async (file) => [file, await readFile(file, "utf8")])),
  );

const main = async () => {
  const components = await exportedComponents(`${UI_SRC}/index.ts`);
  const files = await walk(UI_SRC);
  const gaps = findCatalogGaps({
    components,
    stories: await read(files.filter((file) => file.endsWith(".stories.tsx"))),
    tests: await read(files.filter((file) => /\.test\.tsx?$/.test(file))),
  });
  if (gaps.length > 0) {
    for (const gap of gaps) console.error(`  ${gap}`);
    console.error(
      `${gaps.length} hueco(s) en el catálogo: cada componente exportado por @ice24/ui necesita historia, prueba y matriz de estados.`,
    );
    process.exitCode = 1;
  } else {
    console.info(`${components.length} componentes con historia, prueba y matriz de estados.`);
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
