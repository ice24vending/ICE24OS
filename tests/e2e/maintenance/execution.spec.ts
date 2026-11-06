import { expect, test } from "@playwright/test";
import {
  DEMO_COOKIE,
  defaultDemoState,
  encodeDemoState,
} from "../../../apps/private-web/src/server/demo/state";
import { UI_QUALITY } from "../../visual/review-page";
import { seriousViolations } from "../accessibility/axe";
import {
  captureExecution,
  closeExecution,
  correctExecution,
  reopenExecution,
} from "./execution-flow";
for (const width of [375, 768, 1280, 1440])
  test.describe(`execution ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.beforeEach(async ({ page, context, baseURL }) => {
      await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
      await context.addCookies([
        {
          name: DEMO_COOKIE,
          value: encodeDemoState({ ...defaultDemoState(), persona: "technician" }),
          url: baseURL!,
          httpOnly: true,
        },
      ]);
    });
    test("captures verified evidence and closes from the persisted summary", async ({
      page,
      context,
      baseURL,
    }) => {
      await page.goto("/maintenance/work-orders/10000000-0000-4000-8000-0000000007d3/execute");
      await captureExecution(page);
      expect(await seriousViolations(page)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await context.addCookies([
        {
          name: DEMO_COOKIE,
          value: encodeDemoState({
            ...defaultDemoState(),
            persona: "technician",
            maintenance: "downloaded",
          }),
          url: baseURL!,
          httpOnly: true,
        },
      ]);
      await page.goto("/maintenance/work-orders/10000000-0000-4000-8000-0000000007d3/close");
      await closeExecution(page);
      expect(await seriousViolations(page)).toEqual([]);
    });
    test("links missing requirements and prevents closure", async ({ page }) => {
      await page.goto("/maintenance/work-orders/10000000-0000-4000-8000-0000000007d3/close");
      await expect(page.getByRole("button", { name: "Confirmar cierre" })).toBeDisabled();
      await expect(page.getByRole("link", { name: /Falta Temperatura/ })).toHaveAttribute(
        "href",
        /execute#evidence-temperature$/,
      );
    });
    test("reopens with a required reason while preserving the visible history", async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([
        {
          name: DEMO_COOKIE,
          value: encodeDemoState(defaultDemoState()),
          url: baseURL!,
          httpOnly: true,
        },
      ]);
      await page.goto("/maintenance/work-orders/10000000-0000-4000-8000-0000000007d4/review");
      await reopenExecution(page);
      expect(await seriousViolations(page)).toEqual([]);
    });
    test("compares a correction and keeps the original version visible", async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([
        {
          name: DEMO_COOKIE,
          value: encodeDemoState(defaultDemoState()),
          url: baseURL!,
          httpOnly: true,
        },
      ]);
      await page.goto("/maintenance/work-orders/10000000-0000-4000-8000-0000000007d4/review");
      await correctExecution(page);
      await expect(page.getByRole("heading", { name: "Versiones conservadas" })).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });
  });
