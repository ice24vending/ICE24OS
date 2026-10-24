/**
 * `pnpm test:ui` / `pnpm test:ui:update` (F6-12): accessibility and visual regression with
 * Playwright. Visual baselines must be rendered where CI renders them, so outside Linux (or
 * with UI_QUALITY_DOCKER=1) the run happens in the official Playwright container; on Linux
 * (CI runs inside that same container) it runs directly. Extra arguments go to `playwright test`
 * (e.g. `pnpm test:ui -- --project=accessibility`).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const ROOT = join(import.meta.dirname, "../..");
const IMAGE = "mcr.microsoft.com/playwright:v1.62.1-noble";
const args = process.argv.slice(2).filter((arg) => arg !== "--");
// The shell resolves pnpm(.cmd) on Windows; docker gets its arguments untouched.
const run = (command, commandArgs) =>
  spawnSync(command, commandArgs, {
    cwd: ROOT,
    stdio: "inherit",
    shell: command === "pnpm" && process.platform === "win32",
  }).status ?? 1;

const inDocker = process.platform !== "linux" || process.env.UI_QUALITY_DOCKER === "1";
if (inDocker) {
  console.info(`Ejecutando en ${IMAGE} (las capturas deben coincidir con CI)…`);
  process.exit(
    run("docker", [
      "run",
      "--rm",
      "--ipc=host",
      "-v",
      `${ROOT}:/src`,
      "-v",
      "ice24-ui-quality-cache:/cache",
      IMAGE,
      "bash",
      "/src/scripts/ui-quality/container.sh",
      ...args,
    ]),
  );
}

if (
  !existsSync(join(ROOT, "storybook-static/index.json")) &&
  run("pnpm", ["storybook:build"]) !== 0
)
  process.exit(1);
// `next dev` points next-env.d.ts at .next/dev; restore it so the tree stays clean.
const nextEnvPath = join(ROOT, "apps/private-web/next-env.d.ts");
const nextEnv = readFileSync(nextEnvPath, "utf8");
const status = run("pnpm", ["exec", "playwright", "test", ...args]);
if (readFileSync(nextEnvPath, "utf8") !== nextEnv) writeFileSync(nextEnvPath, nextEnv);
process.exit(status);
