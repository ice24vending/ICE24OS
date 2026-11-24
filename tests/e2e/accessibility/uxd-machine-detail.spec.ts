import { expect, test, type Page } from "@playwright/test";
import {
  UI_QUALITY,
  UI_QUALITY_BASES,
  openReviewState,
  useReviewState,
} from "../../visual/review-page";
import { REVIEW_ROUTES } from "../../visual/ux-review.routes";
import { seriousViolations } from "./axe";
const route = REVIEW_ROUTES.find((item) => item.id === "machine-record")!;
const path = route.path;
async function ready(page: Page) {
  await expect(page.locator("main#main-content")).toHaveAttribute("data-page-ready", "true");
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page).toHaveTitle("Ficha de máquina · ICE24 OS");
  await expect(page.locator("main")).toHaveAttribute("data-page-breadcrumbs", "true");
}
async function accessible(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  expect(await seriousViolations(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
test.describe("UXD-04 · Ficha de máquina", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
    await page.emulateMedia({ reducedMotion: "reduce" });
  });
  for (const width of [375, 1440])
    test(`cinco pestañas, edición y regreso con foco a ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await useReviewState(page.context(), route, route.states[0]!, UI_QUALITY_BASES.web);
      await openReviewState(page, route, route.states[0]!, UI_QUALITY_BASES);
      await ready(page);
      const condition = page.getByRole("region", { name: "Condición", exact: true });
      await expect(condition.locator(".machine-detail__date")).toHaveCount(4);
      await expect(condition).not.toContainText("Sin registro");
      await page.getByRole("button", { name: "Editar nombre y marca" }).click();
      const form = page.getByRole("form", { name: "Editar nombre y marca" });
      await expect(form.getByLabel("Nombre", { exact: true })).toBeFocused();
      await expect(form.getByLabel("Nombre", { exact: true })).not.toHaveValue("");
      await form.getByRole("button", { name: "Cancelar", exact: true }).click();
      await expect(page.getByRole("button", { name: "Editar nombre y marca" })).toBeFocused();
      for (const tab of [
        "Resumen",
        "Componentes",
        "Frecuencias y alertas",
        "Calendario",
        "Historial",
      ]) {
        await page.getByRole("tab", { name: tab, exact: true }).click();
        await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
        await accessible(page);
        if (width === 375) {
          const small = await page
            .locator(
              "main a:visible, main button:visible, main summary:visible, main select:visible",
            )
            .evaluateAll((elements) =>
              elements
                .filter((el) => {
                  const rect = el.getBoundingClientRect();
                  return rect.height < 44 || rect.width < 44;
                })
                .map((el) => el.getAttribute("aria-label") ?? el.textContent),
            );
          expect(small).toEqual([]);
        }
        if (width === 1440) {
          await page.evaluate(() => {
            document.documentElement.style.zoom = "2";
          });
          await accessible(page);
          await page.evaluate(() => {
            document.documentElement.style.zoom = "1";
          });
        }
      }
      const back = page.getByRole("link", { name: "Volver a Máquinas", exact: true });
      await back.click();
      await expect(page).toHaveURL(/\/machines$/);
      await expect(page.locator("main a[data-row-link]").first()).toBeFocused();
    });
  for (const state of route.states.filter((item) =>
    ["carga", "error", "offline", "vacio", "lectura"].includes(item.id),
  ))
    test(`estado ${state.id} conserva contrato y accesibilidad`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 900 });
      await useReviewState(page.context(), route, state, UI_QUALITY_BASES.web);
      await openReviewState(page, route, state, UI_QUALITY_BASES);
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main")).toHaveAttribute(
        "data-page-ready",
        state.id === "carga" ? "false" : "true",
      );
      if (state.id === "error") await expect(page.getByText(/Folio para soporte/)).toBeVisible();
      if (state.id === "vacio")
        await expect(page.getByRole("region", { name: "Condición", exact: true })).toContainText(
          "Sin registro",
        );
      await accessible(page);
    });
  test("un identificador fuera del alcance no expone datos ni acciones", async ({ page }) => {
    await useReviewState(
      page.context(),
      route,
      { id: "scope", label: "Técnico", demo: { persona: "technician" } },
      UI_QUALITY_BASES.web,
    );
    await page.goto(path.replace(/001$/, "003"));
    await ready(page);
    await expect(page.getByRole("button", { name: /^Editar/ })).toHaveCount(0);
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("Cumbres");
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
  });
});
