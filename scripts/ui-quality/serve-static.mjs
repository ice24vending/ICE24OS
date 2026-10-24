/**
 * `node scripts/ui-quality/serve-static.mjs <dir> <port>`: serves a static build (the Storybook
 * of `pnpm storybook:build`) for `pnpm test:ui` (F6-12). Only files inside <dir> are served.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const [dirArg = "storybook-static", portArg = "6106"] = process.argv.slice(2);
const root = resolve(dirArg);
if (!existsSync(join(root, "index.html"))) {
  console.error(`${root} has no index.html: run pnpm storybook:build first.`);
  process.exit(1);
}
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://static").pathname);
  const file = normalize(join(root, pathname === "/" ? "index.html" : pathname));
  if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  response.end(readFileSync(file));
}).listen(Number(portArg), "127.0.0.1", () => console.info(`Serving ${root} on ${portArg}`));
