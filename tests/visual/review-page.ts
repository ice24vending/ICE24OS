/**
 * Opens one screen of tests/visual/ux-review.routes.ts in one state, the same way for the UX
 * gallery (`pnpm ux:snapshots`, F6-00), the accessibility gate and the visual regression
 * (`pnpm test:ui`, F6-12): demo cookie, navigation, waiting for data and the state's steps.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { BrowserContext, Page } from "playwright";

import {
  DEMO_COOKIE,
  defaultDemoState,
  encodeDemoState,
} from "../../apps/private-web/src/server/demo/state";
import {
  REVIEW_ROUTES,
  matrixRoutes,
  type ReviewRoute,
  type ReviewState,
  type StoryEntry,
} from "./ux-review.routes";

/** Servers of `pnpm test:ui` (F6-12): private web in demo mode and the static Storybook. */
export const UI_QUALITY = {
  webPort: Number(process.env.UI_QUALITY_WEB_PORT ?? 3200),
  storybookPort: Number(process.env.UI_QUALITY_STORYBOOK_PORT ?? 6106),
  /** Frozen clock of the demo data (server) and of the browser: same dates on every run. */
  demoNow: "2026-10-20T16:00:00.000Z",
} as const;

export const UI_QUALITY_BASES = {
  // `localhost`: `next dev` reports this host, and the BFF's CSRF check compares origins.
  web: `http://localhost:${UI_QUALITY.webPort}`,
  storybook: `http://127.0.0.1:${UI_QUALITY.storybookPort}`,
} as const;

const STORYBOOK_INDEX = join(import.meta.dirname, "../../storybook-static/index.json");

/** Stories of the static Storybook (`pnpm storybook:build` writes its index). */
export function storybookStories(index = STORYBOOK_INDEX): StoryEntry[] {
  const parsed = JSON.parse(readFileSync(index, "utf8")) as {
    entries: Record<string, StoryEntry>;
  };
  return Object.values(parsed.entries).filter((entry) => entry.type === "story");
}

/** The whole review list: screens, foundations and one route per state matrix. */
export const allReviewRoutes = (): ReviewRoute[] => [
  ...REVIEW_ROUTES,
  ...matrixRoutes(storybookStories()),
];

/** Hides the Next.js development indicator, which is not part of the product. */
export const HIDE_DEV_TOOLS = "nextjs-portal { display: none !important; }";

/** Same locale and time zone as the target users (and for every machine that captures). */
export const REVIEW_CONTEXT = {
  locale: "es-MX",
  timezoneId: "America/Mexico_City",
  reducedMotion: "reduce",
} as const;

export interface ReviewBases {
  /** Private web in demo mode. */
  readonly web: string;
  /** Static Storybook (storybook-static/), for routes with `storybook`. */
  readonly storybook: string;
}

/** Demo selection of the state as the session cookie; public routes go without it. */
export async function useReviewState(
  context: BrowserContext,
  route: ReviewRoute,
  state: ReviewState,
  web: string,
) {
  await context.clearCookies();
  if (route.anonymous) return;
  await context.addCookies([
    {
      name: DEMO_COOKIE,
      value: encodeDemoState({ ...defaultDemoState(), ...state.demo }),
      url: web,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/** Loads the screen and leaves it ready to inspect; `problems` lists what did not go as expected. */
export async function openReviewState(
  page: Page,
  route: ReviewRoute,
  state: ReviewState,
  bases: ReviewBases,
) {
  const problems: string[] = [];
  const onError = (error: Error) => problems.push(`Error en la página: ${error.message}`);
  page.on("pageerror", onError);
  try {
    const url = route.storybook
      ? `${bases.storybook}/iframe.html?id=${encodeURIComponent(route.storybook)}&viewMode=story`
      : `${bases.web}${route.path}`;
    if (state.capture === "loading") {
      const response = await page.goto(url, { waitUntil: "commit" });
      await page
        .waitForSelector('[aria-busy="true"]', { timeout: 8_000 })
        .catch(() => problems.push("No apareció el estado de carga."));
      return { status: response?.status() ?? null, problems };
    }
    const response = await page.goto(url, { waitUntil: "load" });
    if (route.storybook) {
      await page
        .waitForFunction(
          () => (document.querySelector("#storybook-root")?.childElementCount ?? 0) > 0,
          undefined,
          { timeout: 15_000 },
        )
        .catch(() => problems.push("La historia de Storybook no se mostró."));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      return { status: response?.status() ?? null, problems };
    }
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    // Client screens (equipment) fetch after hydration; let them settle.
    await page
      .waitForFunction(() => !document.querySelector('[aria-busy="true"]'), undefined, {
        timeout: 10_000,
      })
      .catch(() => problems.push("La pantalla siguió cargando."));
    if (state.openDemoPanel) await page.click(".demo-panel summary");
    if (state.openContextSelector) await page.click(".context-trigger");
    try {
      for (const step of state.steps ?? []) {
        if ("click" in step)
          await page
            .getByRole(step.role ?? "button", { name: step.click })
            .first()
            .click({ timeout: 10_000 });
        else if ("fill" in step)
          await page.getByLabel(step.fill).first().fill(step.value, { timeout: 10_000 });
        else
          await page.getByLabel(step.select).first().selectOption(step.value, { timeout: 10_000 });
      }
    } catch (cause) {
      problems.push(`No se pudo completar un paso: ${(cause as Error).message.split("\n")[0]}`);
    }
    if (state.steps?.length)
      await page
        .waitForFunction(
          () => !document.querySelector('[aria-busy="true"], .ids-button--loading'),
          undefined,
          {
            timeout: 10_000,
          },
        )
        .catch(() => problems.push("La acción siguió enviándose."));
    // Full-page captures start at the top; the clicks may have scrolled and focused a control.
    if (state.steps?.length)
      await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur();
        window.scrollTo(0, 0);
      });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const status = response?.status() ?? null;
    if (status !== null && status >= 500) problems.push(`Respuesta HTTP ${status}.`);
    return { status, problems };
  } finally {
    page.off("pageerror", onError);
  }
}
