/**
 * UI quality gate (`pnpm test:ui`, F6-12): accessibility (tests/e2e/accessibility) and visual
 * regression (tests/visual) over the screens of tests/visual/ux-review.routes.ts and every
 * Storybook story. The private web runs in demo mode with a frozen clock, so data and dates are
 * the same on every run; Storybook is served from storybook-static/ (build it first).
 *
 * Visual baselines are produced in the official Playwright container, the same environment as
 * CI: run `pnpm test:ui` / `pnpm test:ui:update`, which use Docker outside Linux (see
 * scripts/ui-quality/run.mjs and docs/qa/phase-6/ui-quality.md).
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { defineConfig } from "@playwright/test";

import { REVIEW_CONTEXT, UI_QUALITY, UI_QUALITY_BASES } from "./tests/visual/review-page";

const { webPort, storybookPort } = UI_QUALITY;

export default defineConfig({
  timeout: 90_000,
  expect: {
    timeout: 15_000,
    // Anti-aliasing noise only; a real change moves far more than this.
    toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: "disabled", caret: "initial" },
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // One retry absorbs a slow first compile of `next dev`; a real regression fails twice.
  retries: 1,
  workers: Number(process.env.UI_QUALITY_WORKERS ?? 3),
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  snapshotPathTemplate: "tests/visual/__screenshots__/{arg}{ext}",
  use: {
    baseURL: UI_QUALITY_BASES.web,
    ...REVIEW_CONTEXT,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "accessibility", testDir: "tests/e2e/accessibility" },
    { name: "visual", testDir: "tests/visual", testMatch: /\.visual\.ts$/u },
  ],
  webServer: [
    {
      command: `pnpm --filter @ice24/private-web exec next dev -p ${webPort} -H 127.0.0.1`,
      url: `${UI_QUALITY_BASES.web}/`,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ICE24_DEMO_MODE: "1",
        // Freezes the server clock at the same instant as the browser's (frozen-clock.mjs).
        ICE24_DEMO_NOW: UI_QUALITY.demoNow,
        NODE_OPTIONS: `--import ${pathToFileURL(join(import.meta.dirname, "scripts/ui-quality/frozen-clock.mjs")).href}`,
        // Unreachable on purpose: anything the demo does not serve fails instead of leaving.
        PRIVATE_API_URL: "http://127.0.0.1:9/v1",
        NEXT_TELEMETRY_DISABLED: "1",
        TZ: "America/Mexico_City",
      },
    },
    {
      command: `node scripts/ui-quality/serve-static.mjs storybook-static ${storybookPort}`,
      url: `${UI_QUALITY_BASES.storybook}/index.json`,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
