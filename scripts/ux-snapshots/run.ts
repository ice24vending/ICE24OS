/**
 * `pnpm ux:snapshots` (F6-00): starts the private web in demo mode, captures every screen of
 * tests/visual/ux-review.routes.ts in every state and viewport, and writes the static gallery
 * docs/qa/phase-6/ux-review/index.html. Set UX_SNAPSHOTS_BASE_URL to reuse a server that is
 * already running with ICE24_DEMO_MODE=1.
 *
 * Routes with `storybook` (design-system foundations) are captured from the static Storybook:
 * the script runs `pnpm storybook:build` and serves storybook-static/ locally. Set
 * UX_SNAPSHOTS_SKIP_STORYBOOK_BUILD=1 to reuse an existing build (CI builds it just before).
 */
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize, sep } from "node:path";
import process from "node:process";

import { chromium } from "playwright";

import {
  HIDE_DEV_TOOLS,
  REVIEW_CONTEXT,
  openReviewState,
  storybookStories,
  useReviewState,
} from "../../tests/visual/review-page";
import { matrixRoutes, REVIEW_ROUTES, REVIEW_VIEWPORTS } from "../../tests/visual/ux-review.routes";
import { renderGallery, type Capture } from "./gallery";

const ROOT = join(import.meta.dirname, "../..");
const OUT = join(ROOT, "docs/qa/phase-6/ux-review");
const IMG = join(OUT, "img");
const PORT = Number(process.env.UX_SNAPSHOTS_PORT ?? 3100);
// `localhost`, not 127.0.0.1: `next dev` reports request URLs as localhost, so the BFF's Origin
// check (CSRF) only accepts writes from that host. Template conflict captures send one (F6-10).
const BASE = process.env.UX_SNAPSHOTS_BASE_URL ?? `http://localhost:${PORT}`;
/** `next dev` rewrites it to point at .next/dev; it is restored so the tree stays clean. */
const NEXT_ENV = join(ROOT, "apps/private-web/next-env.d.ts");
const STORYBOOK_DIR = join(ROOT, "storybook-static");
/** 0 lets the OS pick a free port (fixed ones may be reserved, e.g. by Hyper-V on Windows). */
const STORYBOOK_PORT = Number(process.env.UX_SNAPSHOTS_STORYBOOK_PORT ?? 0);
/** Ports Chromium refuses to load (net/base/port_util.cc) that an OS-picked port may hit. */
const UNSAFE_PORTS = new Set([
  5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6679, 6697, 10080,
]);
let storybookBase = "";
const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function startServer(): ChildProcess | undefined {
  if (process.env.UX_SNAPSHOTS_BASE_URL) return undefined;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ICE24_DEMO_MODE: "1",
    // Unreachable on purpose: any call that is not served by the demo fails instead of
    // reaching a real API.
    PRIVATE_API_URL: "http://127.0.0.1:9/v1",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  delete env.NODE_ENV;
  delete env.VERCEL_ENV;
  // One command string: the shell resolves pnpm(.cmd) on every platform.
  const child = spawn(`pnpm --filter @ice24/private-web exec next dev -p ${PORT} -H 127.0.0.1`, {
    cwd: ROOT,
    env,
    shell: true,
    detached: process.platform !== "win32",
  });
  const relay = (stream: NodeJS.WriteStream) => (chunk: Buffer) => {
    for (const line of chunk.toString().split(/\r?\n/))
      if (line.trim()) stream.write(`[next] ${line}\n`);
  };
  child.stdout?.on("data", relay(process.stdout));
  child.stderr?.on("data", relay(process.stderr));
  return child;
}

function stopServer(child: ChildProcess | undefined, nextEnv: string) {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32")
      execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-child.pid, "SIGTERM");
  } catch {
    // Already stopped.
  }
  if (readFileSync(NEXT_ENV, "utf8") !== nextEnv) writeFileSync(NEXT_ENV, nextEnv);
}

/** Builds (unless told not to) and serves storybook-static/ for the foundation captures. */
async function startStorybook(): Promise<Server> {
  if (process.env.UX_SNAPSHOTS_SKIP_STORYBOOK_BUILD !== "1")
    execFileSync("pnpm storybook:build", { cwd: ROOT, stdio: "inherit", shell: true });
  if (!existsSync(join(STORYBOOK_DIR, "iframe.html")))
    throw new Error("storybook-static/ is missing: run pnpm storybook:build first.");
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://storybook").pathname);
    const file = normalize(join(STORYBOOK_DIR, pathname === "/" ? "index.html" : pathname));
    if (!file.startsWith(STORYBOOK_DIR + sep) || !existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
    });
    response.end(readFileSync(file));
  });
  for (;;) {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(STORYBOOK_PORT, "127.0.0.1", resolve);
    });
    const { port } = server.address() as AddressInfo;
    if (!UNSAFE_PORTS.has(port)) {
      storybookBase = `http://127.0.0.1:${port}`;
      return server;
    }
    await new Promise((resolve) => server.close(resolve));
  }
}

async function waitForServer(timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`The private web did not answer at ${BASE} within ${timeoutMs / 1000} s`);
}

async function main() {
  rmSync(IMG, { recursive: true, force: true });
  mkdirSync(IMG, { recursive: true });
  const nextEnv = readFileSync(NEXT_ENV, "utf8");
  const storybook = REVIEW_ROUTES.some((route) => route.storybook)
    ? await startStorybook()
    : undefined;
  const routes = storybook
    ? [...REVIEW_ROUTES, ...matrixRoutes(storybookStories(join(STORYBOOK_DIR, "index.json")))]
    : REVIEW_ROUTES;
  const server = startServer();
  const browser = await chromium.launch();
  const captures: Capture[] = [];
  try {
    await waitForServer();
    for (const viewport of REVIEW_VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        ...REVIEW_CONTEXT,
      });
      const page = await context.newPage();
      for (const route of routes)
        for (const state of route.states) {
          await useReviewState(context, route, state, BASE);
          const file = `${route.id}--${state.id}--${viewport.id}.png`;
          const result = await openReviewState(page, route, state, {
            web: BASE,
            storybook: storybookBase,
          });
          // caret "initial": hiding it injects a style that React reports as a hydration mismatch.
          await page.screenshot({
            path: join(IMG, file),
            fullPage: true,
            style: HIDE_DEV_TOOLS,
            caret: "initial",
          });
          captures.push({
            route: route.id,
            state: state.id,
            viewport: viewport.id,
            file,
            ...result,
          });
          console.info(
            `${result.problems.length ? "⚠" : "✓"} ${route.path} · ${state.label} · ${viewport.label}`,
          );
        }
      await context.close();
    }
  } finally {
    await browser.close();
    stopServer(server, nextEnv);
    storybook?.close();
  }
  let commit = "sin git";
  try {
    commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT }).toString().trim();
  } catch {
    // Outside a git checkout.
  }
  writeFileSync(
    join(OUT, "index.html"),
    renderGallery({
      routes,
      viewports: REVIEW_VIEWPORTS,
      captures,
      generatedAt: new Date(),
      commit,
    }),
  );
  writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify({ commit, captures }, null, 2)}\n`);
  const failed = captures.filter((capture) => capture.problems.length > 0);
  console.info(`\nGalería: ${join(OUT, "index.html")} (${captures.length} capturas)`);
  if (failed.length > 0) {
    console.error(`${failed.length} capturas con observaciones:`);
    for (const capture of failed)
      console.error(`  ${capture.file}: ${capture.problems.join(" | ")}`);
    process.exitCode = 1;
  }
}

await main();
