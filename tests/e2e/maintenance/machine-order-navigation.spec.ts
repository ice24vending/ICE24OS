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
    for (const persona of ["owner", "admin", "technician", "readonly"] as const)
      test(`maintenance machine links and silent invalid selection for ${persona}`, async ({
        page,
        context,
        baseURL,
      }) => {
        await context.addCookies([
          {
            name: DEMO_COOKIE,
            value: encodeDemoState({ ...defaultDemoState(), persona }),
            url: baseURL!,
            httpOnly: true,
          },
        ]);
        async function openRecord(link: ReturnType<typeof page.locator>) {
          const href = await link.getAttribute("href");
          await link.click();
          await expect(page).toHaveURL(new RegExp(href!.replace("?", "\\?")));
          const record = page.locator(".machine-record");
          await expect(record).toBeFocused();
          await expect.poll(async () => (await record.boundingBox())!.y).toBeLessThan(350);
          await expect(
            page.locator('a[href="/machines"][aria-current="page"]').first(),
          ).toBeAttached();
          expect(await seriousViolations(page)).toEqual([]);
        }
        await page.goto("/maintenance?view=list");
        await openRecord(page.locator(".maintenance-machine-link").first());
        for (const view of ["Mes", "Semana", "Día"]) {
          await page.goto("/maintenance?view=calendar");
          // Choose a day with data before switching views, including narrow mobile calendars.
          await page
            .getByRole("button", { name: /, [1-9]\d* actividades/ })
            .first()
            .click();
          await page.getByRole("button", { name: view, exact: true }).click();
          await openRecord(
            page
              .getByRole("region", { name: "Actividades del día" })
              .locator(".maintenance-machine-link")
              .first(),
          );
        }
        for (const value of [
          "invalid",
          "c0000000-0000-4000-8000-000000000005",
          "c0000000-0000-4000-8000-000000000001&machineId=invalid",
          ...(persona === "admin" || persona === "technician"
            ? ["c0000000-0000-4000-8000-000000000003"]
            : []),
        ]) {
          await page.goto(`/machines?machineId=${value}`);
          await expect(
            page.getByRole("button", { name: "Ver / editar", exact: true }).first(),
          ).toBeVisible();
          await expect(page.locator(".machine-record")).toHaveCount(0);
          // Next keeps an empty route announcer with role=alert outside the main landmark.
          await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
        }
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
        body: await record.screenshot({ caret: "initial" }),
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
      await expect(page.locator(".work-order-filter-panel")).toHaveAttribute("open", "");
      await page.getByLabel("Vista", { exact: true }).selectOption("assigned");
      await page.getByLabel("Estado", { exact: true }).selectOption("completed");
      await page.getByRole("button", { name: "Aplicar filtros" }).click();
      await expect(page).toHaveURL(/state=completed/);
      const rows = page.getByRole("region", { name: "Órdenes de trabajo" });
      await expect(rows.locator(".work-order-row").first()).toBeVisible();
      await expect(rows.locator(".ids-tag").filter({ hasText: "Completado" })).toHaveCount(
        await rows.locator(".work-order-row").count(),
      );
      const machine = await page
        .getByLabel("Máquina", { exact: true })
        .locator("option")
        .nth(2)
        .getAttribute("value");
      await page.getByLabel("Máquina", { exact: true }).selectOption(machine!);
      await page.getByRole("button", { name: "Aplicar filtros" }).click();
      await expect(page).toHaveURL(new RegExp(`machineId=${machine}`));
      await expect(rows.locator(".work-order-row")).toHaveCount(1);
      const technician = await page
        .getByLabel("Responsable", { exact: true })
        .locator("option")
        .nth(1)
        .getAttribute("value");
      await page.getByLabel("Responsable", { exact: true }).selectOption(technician!);
      await page.getByRole("button", { name: "Aplicar filtros" }).click();
      await expect(page).toHaveURL(new RegExp(`assigneeId=${technician}`));
      await expect(rows.locator(".work-order-row")).toHaveCount(1);
      await page.getByLabel("Vista", { exact: true }).selectOption("pending");
      await page.getByRole("button", { name: "Aplicar filtros" }).click();
      await expect(page).toHaveURL(/view=pending/);
      await expect(
        page.getByText("No hay órdenes con estos filtros en tu contexto."),
      ).toBeVisible();
      await page.getByRole("link", { name: "Limpiar filtros" }).click();
      await expect(page).toHaveURL(/\/maintenance\/work-orders$/);
      await page.getByRole("link", { name: /^OT-/ }).first().click();
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
