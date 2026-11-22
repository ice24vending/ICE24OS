import { expect, test, type Page } from "@playwright/test";
import { UI_QUALITY, UI_QUALITY_BASES, useReviewState } from "../../visual/review-page";
import { REVIEW_ROUTES, type ReviewState } from "../../visual/ux-review.routes";
import { seriousViolations } from "./axe";
import {
  DEMO_PERSONAS,
  ROLE_PERMISSIONS,
} from "../../../apps/private-web/src/server/demo/personas";
const summary = REVIEW_ROUTES.find((r) => r.id === "resumen")!;
async function open(
  page: Page,
  state: ReviewState = { id: "activity", label: "Operación", demo: { maintenance: "operation" } },
) {
  await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
  await useReviewState(page.context(), summary, state, UI_QUALITY_BASES.web);
  await page.goto("/summary");
  await expect(page.locator("#main-content")).toHaveCount(1);
  await expect(page.locator("#main-content")).toHaveAttribute("data-page-ready", "true");
}
test.describe("UXD-01 · Resumen", () => {
  for (const size of [
    { width: 375, zoom: 1 },
    { width: 1280, zoom: 2 },
    { width: 640, zoom: 1 },
    { width: 1440, zoom: 1 },
  ]) {
    test(`tablero accesible a ${size.width} px y zoom ${size.zoom}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: 900 });
      await open(page);
      if (size.zoom === 2)
        await page.evaluate(() => {
          document.documentElement.style.zoom = "2";
        });
      await expect(page).toHaveTitle("Resumen · ICE24 OS");
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const indicators = page.getByRole("region", { name: "Indicadores", exact: true });
      await expect(indicators.getByRole("link")).toHaveCount(4);
      await expect(indicators.getByRole("link", { name: /Máquinas disponibles/ })).toContainText(
        "5",
      );
      await expect(indicators.getByRole("link", { name: /Alertas sin enterado/ })).toContainText(
        "2",
      );
      await expect(indicators.getByRole("link", { name: /Tickets abiertos hoy/ })).toContainText(
        "4",
      );
      await expect(indicators.getByRole("link", { name: /Mantenimientos/ })).toContainText(
        "2 vencidos",
      );
      await expect(indicators.getByRole("link", { name: /Mantenimientos/ })).toContainText(
        "9 próximos",
      );
      await expect(
        page.getByRole("region", { name: "Tablero operativo" }).getByRole("table"),
      ).toHaveCount(4);
      await expect(page.locator(".summary-screen__tasks tbody tr")).toHaveCount(5);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);
      if (size.width === 375)
        for (const link of await page
          .locator(".ids-kpi-link:visible,.summary-screen__tasks a:visible")
          .all()) {
          const box = await link.boundingBox();
          expect(box!.height).toBeGreaterThanOrEqual(44);
        }
      await indicators.getByRole("link").first().focus();
      expect(
        await indicators
          .getByRole("link")
          .first()
          .evaluate((el) => getComputedStyle(el).outlineStyle),
      ).not.toBe("none");
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
  for (const persona of ["owner", "technician", "readonly", "admin"] as const) {
    test(`${persona}: permisos y acceso a las listas`, async ({ page }) => {
      await open(page, {
        id: persona,
        label: persona,
        demo: { persona, maintenance: "operation" },
      });
      const permissions = ROLE_PERMISSIONS[DEMO_PERSONAS[persona].role];
      await expect(page.getByRole("button", { name: "Marcar enterado", exact: true })).toHaveCount(
        permissions.includes("notifications.attend") ? 1 : 0,
      );
      for (const action of ["Asignar técnico", "Reportar falla", "Crear orden", "Ejecutar orden"])
        await expect(page.getByRole("button", { name: action, exact: true })).toHaveCount(0);
      for (const [name, href] of [
        ["Máquinas disponibles", "/machines"],
        ["Alertas sin enterado", "/notifications"],
        ["Tickets abiertos hoy", "/maintenance/tickets"],
        ["Mantenimientos", "/maintenance?view=list"],
      ])
        await expect(
          page
            .getByRole("region", { name: "Indicadores", exact: true })
            .getByRole("link", { name: new RegExp(name!) }),
        ).toHaveAttribute("href", href!);
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
  test("el escenario se elige en el panel Demo y conserva los datos al abrir Tickets", async ({
    page,
  }) => {
    await open(page, { id: "normal", label: "Normal" });
    await page.locator(".demo-panel summary").click();
    await page
      .locator('select[name="maintenance"]')
      .selectOption({ label: "Operación con actividad" });
    await page.getByRole("button", { name: "Aplicar", exact: true }).click();
    await expect(page.locator("#main-content")).toHaveCount(1);
    await expect(page.locator("#main-content")).toHaveAttribute("data-page-ready", "true");
    await expect(page.getByRole("link", { name: /Tickets abiertos hoy/ })).toContainText("4");
    await page.getByRole("link", { name: /Tickets abiertos hoy/ }).click();
    await expect(page).toHaveURL(/\/maintenance\/tickets$/);
    await expect(page.getByRole("link", { name: /TKT-000001/ }).first()).toBeVisible();
  });
  test("vacío y error son distintos; el error conserva el folio y nunca muestra cero", async ({
    page,
  }) => {
    await open(page, { id: "empty", label: "Vacío", demo: { maintenance: "operation-empty" } });
    await expect(page.getByText("No hay tareas por atender", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Tu cuenta todavía no tiene máquinas.", { exact: true }),
    ).toBeVisible();
    await open(page, {
      id: "error",
      label: "Error",
      demo: { network: "error", maintenance: "operation" },
    });
    await expect(page.getByText("Folio para soporte", { exact: false }).first()).toBeVisible();
    for (const value of await page.locator(".ids-kpi__value").all())
      await expect(value).toHaveText("Sin datos");
    expect(await seriousViolations(page)).toEqual([]);
  });
});
