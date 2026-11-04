import { expect, test } from "@playwright/test";
import {
  DEMO_COOKIE,
  defaultDemoState,
  encodeDemoState,
} from "../../../apps/private-web/src/server/demo/state";
import { seriousViolations } from "../accessibility/axe";

for (const width of [375, 1440])
  test.describe(`machine and order navigation ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.beforeEach(async ({ context, baseURL, page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await context.addCookies([
        {
          name: DEMO_COOKIE,
          value: encodeDemoState(defaultDemoState()),
          url: baseURL!,
          httpOnly: true,
        },
      ]);
    });
    test("machine selection focuses its record, distinct tabs and preselected report", async ({
      page,
    }, testInfo) => {
      await page.goto("/machines");
      const select = page.getByRole("button", { name: "Ver / editar", exact: true }).first();
      await select.click();
      const record = page.locator(".machine-record");
      await expect(record).toBeFocused();
      await expect.poll(async () => (await record.boundingBox())!.y).toBeLessThan(350);
      const icons = await record
        .getByRole("tab")
        .locator("svg")
        .evaluateAll((nodes) => nodes.map((node) => node.innerHTML));
      expect(icons).toHaveLength(4);
      expect(new Set(icons).size).toBe(4);
      await testInfo.attach(`machine-record-${width}`, {
        body: await record.screenshot(),
        contentType: "image/png",
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      await select.click();
      await expect(record).toBeFocused();
      const report = record.getByRole("link", { name: "Reportar una falla", exact: true });
      const machineId = new URL(
        (await report.getAttribute("href"))!,
        "http://localhost",
      ).searchParams.get("machineId");
      await report.click();
      await expect(page.getByLabel("Máquina", { exact: true })).toHaveValue(machineId!);
      await expect(
        page.getByRole("heading", { name: "Reportar una falla", exact: true }),
      ).toBeVisible();
    });
    test("filters update URL and results; order origin provides a verified return route", async ({
      page,
    }) => {
      await page.goto("/maintenance/work-orders");
      await page.locator(".work-order-filter-panel > summary").click();
      await page.getByLabel("Estado", { exact: true }).selectOption("completed");
      await expect(page).toHaveURL(/state=completed/);
      const rows = page.getByRole("region", { name: "Órdenes asignadas" });
      await expect(rows.locator(".ids-card").first()).toBeVisible();
      await expect(rows.locator(".ids-tag").filter({ hasText: "Completado" })).toHaveCount(
        await rows.locator(".ids-card").count(),
      );
      const machine = await page
        .getByLabel("Máquina", { exact: true })
        .locator("option")
        .nth(2)
        .getAttribute("value");
      await page.getByLabel("Máquina", { exact: true }).selectOption(machine!);
      await expect(page).toHaveURL(new RegExp(`machineId=${machine}`));
      await expect(rows.locator(".ids-card")).toHaveCount(1);
      const technician = await page
        .getByLabel("Responsable", { exact: true })
        .locator("option")
        .nth(1)
        .getAttribute("value");
      await page.getByLabel("Responsable", { exact: true }).selectOption(technician!);
      await expect(page).toHaveURL(new RegExp(`assigneeId=${technician}`));
      await expect(rows.locator(".ids-card")).toHaveCount(1);
      await page.getByLabel("Vista", { exact: true }).selectOption("pending");
      await expect(page).toHaveURL(/view=pending/);
      await expect(
        page.getByText("No hay órdenes con estos filtros en tu contexto."),
      ).toBeVisible();
      await page.getByRole("link", { name: "Limpiar filtros" }).click();
      await expect(page).toHaveURL(/\/maintenance\/work-orders$/);
      await page
        .getByRole("link", { name: /^Ver OT-/ })
        .first()
        .click();
      await expect(page.getByText("Ticket origen · TKT-000001")).toBeVisible();
      await page.getByRole("link", { name: "Ver reporte original" }).click();
      await expect(page.locator('.ids-navigation-tabs [aria-current="page"]')).toHaveText(
        "Tickets",
      );
      await expect(page.getByText("Reporte origen de OT-000001")).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Ruta de navegación" })).toContainText(
        "Detalle del ticket",
      );
      await page.getByRole("link", { name: "Volver a OT-000001" }).click();
      await expect(page.locator('.ids-navigation-tabs [aria-current="page"]')).toHaveText(
        "Órdenes",
      );
      await expect(page.getByRole("navigation", { name: "Ruta de navegación" })).toContainText(
        "Detalle de la orden",
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(await seriousViolations(page)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.goto(
        "/maintenance/tickets/70000000-0000-4000-8000-000000000384?fromOrder=10000000-0000-4000-8000-0000000007da",
      );
      await expect(
        page.getByRole("heading", { name: "Detalle del ticket", exact: true }),
      ).toBeVisible();
      await expect(page.getByText(/Reporte origen de OT-/)).toHaveCount(0);
    });
  });
