import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { offlineShellFiles, versionOfflineCache } from "./offline-cache.mjs";
it("versions every public shell resource deterministically without touching downloaded data", async () => {
  const root = await mkdtemp(join(tmpdir(), "ice24-cache-"));
  try {
    await mkdir(join(root, "offline-work"));
    await writeFile(join(root, "sw.js"), 'const CACHE_VERSION = "v5";');
    for (const file of offlineShellFiles) await writeFile(join(root, file), file);
    let version = await versionOfflineCache(root);
    expect(await versionOfflineCache(root)).toBe(version);
    for (const file of offlineShellFiles) {
      await writeFile(join(root, file), `${file} changed`);
      const next = await versionOfflineCache(root);
      expect(next).not.toBe(version);
      expect(await versionOfflineCache(root)).toBe(next);
      version = next;
    }
    await writeFile(
      join(root, "sw.js"),
      `${await readFile(join(root, "sw.js"), "utf8")}\n// worker update`,
    );
    expect(await versionOfflineCache(root)).not.toBe(version);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
