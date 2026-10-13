import { writeFile } from "node:fs/promises";

import { format, resolveConfig } from "prettier";

import { renderTokensCss } from "../packages/ui/src/tokens/css.js";

/** Writes packages/ui/src/tokens/tokens.css from the TypeScript tokens (F6-02). */
const target = new URL("../packages/ui/src/tokens/tokens.css", import.meta.url);
const options = await resolveConfig(target);
await writeFile(target, await format(renderTokensCss(), { ...options, parser: "css" }));
console.info(`Tokens written to ${target.pathname}`);
