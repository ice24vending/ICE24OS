import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import type { Walkthrough } from "../../tests/visual/walkthroughs/maintenance";
import { useReviewState, REVIEW_CONTEXT, UI_QUALITY } from "../../tests/visual/review-page";
import { reportTicketWithPhoto } from "../../tests/e2e/maintenance/ticket-photo-flow";
import { assignDemoWorkOrder } from "../../tests/e2e/maintenance/work-order-flow";
import { offlineFieldFlow } from "../../tests/e2e/maintenance/offline-field-flow";
import { openMachineRecordFromMaintenance } from "../../tests/e2e/maintenance/machine-record-flow";
import {
  captureExecution,
  closeExecution,
  correctExecution,
  reopenExecution,
} from "../../tests/e2e/maintenance/execution-flow";

const root = join(import.meta.dirname, "../..");
const flowsDirectory = join(root, "tests/visual/walkthroughs");
const walkthroughs: Walkthrough[] = [];
for (const file of readdirSync(flowsDirectory)
  .filter((name) => name.endsWith(".ts"))
  .sort()) {
  const definition = (await import(pathToFileURL(join(flowsDirectory, file)).href)) as {
    walkthroughs: readonly Walkthrough[];
  };
  walkthroughs.push(...definition.walkthroughs);
}
const out = join(root, "docs/qa/phase-7/walkthroughs");
const base = process.env.UX_WALKTHROUGHS_BASE_URL ?? "http://localhost:3300";
const nextEnvPath = join(root, "apps/private-web/next-env.d.ts");
const nextEnv = readFileSync(nextEnvPath, "utf8");
const env: NodeJS.ProcessEnv = {
  ...process.env,
  ICE24_DEMO_MODE: "1",
  ICE24_DEMO_NOW: UI_QUALITY.demoNow,
  NODE_OPTIONS: `--import ${pathToFileURL(join(root, "scripts/ui-quality/frozen-clock.mjs")).href}`,
  NEXT_PUBLIC_ICE24_OFFLINE_SHELL: "1",
  PRIVATE_API_URL: "http://127.0.0.1:9/v1",
  NEXT_TELEMETRY_DISABLED: "1",
};
delete env.NODE_ENV;
delete env.VERCEL_ENV;
const server = process.env.UX_WALKTHROUGHS_BASE_URL
  ? undefined
  : spawn(
      process.execPath,
      [
        join(root, "apps/private-web/node_modules/next/dist/bin/next"),
        "dev",
        "-p",
        "3300",
        "-H",
        "127.0.0.1",
      ],
      { cwd: join(root, "apps/private-web"), env, stdio: "ignore" },
    );
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
mkdirSync(out, { recursive: true });
const videos: string[] = [];
const browser = await chromium.launch();
async function showCaption(page: Page, label: string) {
  await page.evaluate((text) => {
    document.getElementById("review-step-caption")?.remove();
    const caption = document.createElement("p");
    caption.id = "review-step-caption";
    caption.setAttribute("role", "status");
    caption.textContent = text;
    caption.style.cssText =
      "position:fixed;bottom:0;left:0;right:0;z-index:9999;padding:var(--space-3);margin:0;background:var(--color-surface-default);color:var(--color-text-default);border:2px solid currentColor;pointer-events:none";
    document.body.append(caption);
  }, label);
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (
      await fetch(base, { signal: AbortSignal.timeout(1500) })
        .then((r) => r.ok)
        .catch(() => false)
    ) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("El servidor demo no inició");
  for (const flow of walkthroughs) {
    const context = await browser.newContext({
      ...REVIEW_CONTEXT,
      baseURL: base,
      viewport: { width: 375, height: 812 },
      recordVideo: { dir: out, size: { width: 375, height: 812 } },
    });
    const page = await context.newPage();
    const video = page.video();
    try {
      await useReviewState(
        context,
        { id: flow.id, title: flow.title, path: "/", review: flow.title, states: [] },
        { id: "normal", label: "Normal", demo: flow.demo },
        base,
      );
      for (const step of flow.steps) {
        if (step.demo)
          await useReviewState(
            context,
            { id: flow.id, title: flow.title, path: "/", review: flow.title, states: [] },
            { id: "step", label: step.label, demo: { ...flow.demo, ...step.demo } },
            base,
          );
        const response = await page.goto(`${base}${step.path}`);
        if (!response?.ok()) throw new Error(`Falló ${step.path}: ${response?.status()}`);
        await page.getByRole("heading", { name: step.heading, exact: true }).waitFor();
        if (step.interaction === "ticket-photo") await reportTicketWithPhoto(page);
        if (step.interaction === "work-order-assign") await assignDemoWorkOrder(page);
        if (step.interaction === "execution-capture") await captureExecution(page);
        if (step.interaction === "execution-close") await closeExecution(page);
        if (step.interaction === "execution-correct") await correctExecution(page);
        if (step.interaction === "execution-reopen") await reopenExecution(page);
        if (step.interaction === "offline-field")
          await offlineFieldFlow(page, base, (label) => showCaption(page, label));
        if (step.interaction === "offline-conflict")
          await offlineFieldFlow(page, base, (label) => showCaption(page, label), {
            conflict: true,
          });
        if (step.interaction === "machine-record") await openMachineRecordFromMaintenance(page);
        await showCaption(page, step.label);
        // Deliberate viewing time in the recording, not a readiness check.
        await page.waitForTimeout(1800);
      }
    } finally {
      await context.close();
    }
    if (!video) throw new Error("No se generó video");
    await video.saveAs(join(out, `${flow.id}.webm`));
    videos.push(
      `<section><h2>${escape(flow.title)}</h2><video controls preload="metadata" width="375" src="${escape(flow.id)}.webm"></video></section>`,
    );
  }
  writeFileSync(
    join(out, "index.html"),
    `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Recorridos Fase 7</title><h1>Fase 7 — Recorridos</h1><p>Datos ficticios. El recorrido de campo usa IndexedDB y service worker reales; el almacenamiento remoto de fotos es un doble de prueba. Las maquetas P0 siguen siendo simulaciones.</p>${videos.join("")}</html>`,
  );
  console.info(`${videos.length} recorridos verificados: ${out}`);
} finally {
  await browser.close();
  if (server?.pid) {
    if (process.platform === "win32")
      execFileSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    else server.kill();
    writeFileSync(nextEnvPath, nextEnv);
  }
}
