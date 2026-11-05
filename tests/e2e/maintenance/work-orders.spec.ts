import { expect, test } from "@playwright/test";
import {
  DEMO_COOKIE,
  defaultDemoState,
  encodeDemoState,
} from "../../../apps/private-web/src/server/demo/state";
import { UI_QUALITY } from "../../visual/review-page";
import { seriousViolations } from "../accessibility/axe";
import { assignDemoWorkOrder } from "./work-order-flow";
const createPath =
  "/maintenance/work-orders/new?sourceType=ticket&sourceId=70000000-0000-4000-8000-000000000384";
for (const width of [375, 768, 1280, 1440])
  test.describe(`work orders ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.beforeEach(async ({ page, context, baseURL }) => {
      await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
      await context.addCookies([
        {
          name: DEMO_COOKIE,
          value: encodeDemoState(defaultDemoState()),
          url: baseURL!,
          httpOnly: true,
        },
      ]);
    });
    test("assigns from ticket and displays frozen requirements accessibly", async ({ page }) => {
      await page.goto("/maintenance/tickets/70000000-0000-4000-8000-000000000384");
      await page.getByRole("link", { name: "Asignar técnico" }).click();
      await assignDemoWorkOrder(page);
      await page.getByRole("link", { name: "Ver orden actualizada" }).click();
      await expect(page.getByRole("heading", { name: "Procedimiento y requisitos" })).toBeVisible();
      await expect(page.getByText("Filtro de agua: 1 pieza")).toBeVisible();
      await expect(page.locator('[data-work-orders-ready="true"]')).toBeVisible();
      await expect(page.getByRole("button", { name: "Cambiar responsable" })).toBeEnabled();
      await page.evaluate(() =>
        Promise.allSettled(document.getAnimations().map((animation) => animation.finished)),
      );
      expect(await seriousViolations(page)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
    test("preserves failed assignment, warns before leaving and blocks offline", async ({
      page,
      context,
    }) => {
      await page.goto(createPath);
      await expect(page.locator('[data-work-orders-ready="true"]')).toBeVisible();
      await page.getByLabel("Motivo").fill("Revisión solicitada durante el turno");
      await page.getByRole("link", { name: "Órdenes", exact: true }).click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await context.setOffline(true);
      await expect(page.getByRole("button", { name: "Crear orden y asignar" })).toBeDisabled();
      await context.setOffline(false);
    });
  });
