import { expect, test } from "@playwright/test";
import {
  DEMO_COOKIE,
  defaultDemoState,
  encodeDemoState,
} from "../../../apps/private-web/src/server/demo/state";
import { UI_QUALITY } from "../../visual/review-page";
const order = "/maintenance/work-orders/10000000-0000-4000-8000-0000000007d3";
const routes = [
  "/summary",
  "/maintenance",
  "/maintenance/tickets",
  "/maintenance/tickets/new",
  "/maintenance/tickets/70000000-0000-4000-8000-000000000384",
  "/maintenance/work-orders",
  "/maintenance/work-orders/new",
  order,
  `${order}/execute`,
  `${order}/close`,
  "/maintenance/work-orders/10000000-0000-4000-8000-0000000007d4/review",
  "/maintenance/synchronization",
];
for (const width of [390, 1280])
  for (const persona of [
    "owner",
    "admin",
    "technician",
    "readonly",
    "ice24",
    "platform",
  ] as const) {
    test(`polish ${persona} ${width}: twelve surfaces`, async ({ page, context, baseURL }) => {
      test.setTimeout(180000);
      await page.setViewportSize({ width, height: 900 });
      await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
      await context.addCookies([
        {
          name: DEMO_COOKIE,
          value: encodeDemoState({ ...defaultDemoState(), persona }),
          url: baseURL!,
          httpOnly: true,
        },
      ]);
      for (const route of routes)
        await test.step(route, async () => {
          await page.goto(route);
          await expect(page.locator("main").first()).toBeVisible();
          for (const panel of await page.locator('main [data-state="forbidden"]').all())
            await expect(panel).not.toContainText("Volver a intentar");
          const main = page.locator("main").first();
          await expect(main).not.toContainText(
            /F7-D0|DEC-\d|ADR-\d|Política provisional|Propuesta de vigencia/,
          );
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          const padding = await main.evaluate((el) => {
            const s = getComputedStyle(el);
            return parseFloat(s.paddingLeft) + parseFloat(s.marginLeft);
          });
          expect(padding).toBeGreaterThanOrEqual(16);
          if (route === "/maintenance/work-orders/new") {
            if (persona === "owner" || persona === "admin")
              await expect(
                page.getByText(
                  "Para asignar un técnico, elige un ticket o una actividad programada.",
                ),
              ).toBeVisible();
            else await expect(main.getByRole("link", { name: "Volver a órdenes" })).toBeVisible();
          }
          if (route.endsWith("/review") && ["readonly", "ice24", "platform"].includes(persona)) {
            await expect(page.getByRole("heading", { name: "Acción de revisión" })).toHaveCount(0);
            await expect(page.getByLabel("Motivo obligatorio")).toHaveCount(0);
          }
          if (route.endsWith("/execute") && ["readonly", "ice24", "platform"].includes(persona))
            await expect(page.getByRole("button", { name: "Agregar refacción" })).toBeDisabled();
          if (route === "/maintenance/work-orders" && persona === "technician") {
            await expect(page.getByLabel("Responsable", { exact: true })).toHaveCount(0);
            await expect(page.getByText("Mostrando 20 de 36 órdenes")).toBeVisible();
            await page.getByRole("button", { name: "Cargar más órdenes" }).click();
            await expect(page.getByText("Mostrando 36 de 36 órdenes")).toBeVisible();
            await expect(page.locator(".work-order-row").first()).toContainText("Ana Torres");
          }
          if (route === "/summary") {
            await expect(page.locator(".summary-task-list li")).toHaveCount(5);
            await expect(main).not.toContainText("cuando se active ese módulo");
          }
        });
    });
  }
test("active empty tasks differs from disabled module", async ({ page, context, baseURL }) => {
  for (const maintenance of ["empty", "disabled"] as const) {
    await context.addCookies([
      {
        name: DEMO_COOKIE,
        value: encodeDemoState({ ...defaultDemoState(), maintenance }),
        url: baseURL!,
        httpOnly: true,
      },
    ]);
    await page.goto("/summary");
    await expect(
      page.getByText(
        maintenance === "empty" ? "No hay tareas por atender" : "Mantenimiento deshabilitado",
        { exact: true },
      ),
    ).toBeVisible();
  }
});
