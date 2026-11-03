import { expect, test } from "@playwright/test";
import {
  defaultDemoState,
  encodeDemoState,
  DEMO_COOKIE,
} from "../../../apps/private-web/src/server/demo/state";
import { seriousViolations } from "../accessibility/axe";

for (const width of [375, 768, 1280, 1440]) {
  test.describe(`F7 scheduling ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    test("P0 mockups retain accessible labels and fit the viewport", async ({
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
      for (const screen of ["UI-WO-01", "UI-WO-02", "UI-WO-03", "UI-WO-04", "UI-SYNC-01"]) {
        await page.goto(`/maintenance/review/${screen}`);
        await expect(page.getByText("Maqueta — sin lógica.", { exact: false })).toBeVisible();
        expect(await seriousViolations(page), screen).toEqual([]);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          screen,
        ).toBe(true);
      }
    });
    test("summary KPI, URL filters, overdue history and accessible calendar", async ({
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
      await page.goto("/summary");
      const kpi = page
        .locator("article")
        .filter({ has: page.getByRole("heading", { name: "Mantenimientos próximos" }) });
      await expect(kpi).toContainText("Próximos 7 días");
      await kpi.getByRole("link").click();
      await expect(page).toHaveURL(/period=next7days/);
      await expect(page.getByRole("heading", { name: "Actividades programadas" })).toBeVisible();
      const toggle = page.getByRole("button", { name: /^Filtros/ });
      if (width === 375) {
        await expect(toggle).toBeVisible();
        await toggle.click();
      }
      await expect(page.getByLabel("Periodo", { exact: true })).toBeVisible();
      await page.getByLabel("Periodo", { exact: true }).selectOption("");
      await page.getByLabel("Estado", { exact: true }).selectOption("overdue");
      await page.getByRole("button", { name: "Aplicar filtros" }).click();
      await expect(page).toHaveURL(/state=overdue/);
      await expect(page.locator(".ids-tag").filter({ hasText: "Vencida" }).first()).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("Estado", { exact: true })).toHaveValue("overdue");
      if (width === 375) await expect(toggle).toBeEnabled();
      expect(await seriousViolations(page)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.getByRole("link", { name: "Calendario", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Calendario de mantenimiento" }),
      ).toBeVisible();
      await expect(page.locator(".ids-tag").filter({ hasText: "Vencida" }).first()).toBeVisible();
      if (width === 375) await expect(toggle).toBeEnabled();
      expect(await seriousViolations(page)).toEqual([]);
      await page.screenshot({
        path: `docs/qa/phase-7/evidence/calendar-${width}.png`,
        fullPage: true,
      });
    });
    test("disabled module hides KPI and denies direct access", async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([
        {
          name: DEMO_COOKIE,
          value: encodeDemoState({ ...defaultDemoState(), maintenance: "disabled" }),
          url: baseURL!,
          httpOnly: true,
        },
      ]);
      await page.goto("/summary");
      await expect(page.getByRole("heading", { name: "Mantenimientos próximos" })).toHaveCount(0);
      await page.goto("/maintenance");
      await expect(page.getByRole("heading", { name: "Sin permiso" })).toBeVisible();
    });
  });
}
