import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Only public, generic shell resources. Never include downloaded records or authenticated HTML.
export const offlineShellFiles = [
  "offline-shell.html",
  "offline-shell.js",
  "offline-work.html",
  "offline-work/app.js",
  "offline-work/app.css",
];
export async function versionOfflineCache(publicDirectory) {
  const path = join(publicDirectory, "sw.js");
  const worker = await readFile(path, "utf8");
  const pattern = /const CACHE_VERSION = "[^"]+";/;
  if (!pattern.test(worker)) throw new Error("Offline worker cache version marker missing");
  const normalized = worker.replace(pattern, 'const CACHE_VERSION = "BUILD_CONTENT";');
  const hash = createHash("sha256").update(normalized.replace(/\r\n/g, "\n"));
  for (const file of offlineShellFiles) {
    hash
      .update(file)
      .update("\0")
      .update(await readFile(join(publicDirectory, file)))
      .update("\0");
  }
  const version = `build-${hash.digest("hex").slice(0, 24)}`;
  const result = worker.replace(pattern, `const CACHE_VERSION = "${version}";`);
  if (result !== worker) await writeFile(path, result);
  return version;
}
