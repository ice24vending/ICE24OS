import { expect, test, type Page } from "@playwright/test";
import {
  UI_QUALITY,
  UI_QUALITY_BASES,
  useReviewState,
  openReviewState,
} from "../../visual/review-page";
import { REVIEW_ROUTES, type ReviewState } from "../../visual/ux-review.routes";
import { seriousViolations } from "./axe";
const normal: ReviewState = {
  id: "normal",
  label: "Administrador ICE24",
  demo: { persona: "platform" },
};
async function open(page: Page, id: string, state = normal) {
  const route = REVIEW_ROUTES.find((candidate) => candidate.id === id)!;
  await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
  await useReviewState(page.context(), route, state, UI_QUALITY_BASES.web);
  const result = await openReviewState(page, route, state, UI_QUALITY_BASES);
  expect(result.problems).toEqual([]);
}
test.describe("UXD-13 · Revisión IA", () => {
  // Owner first: these two internal destinations must never expose their actions to OW.
  for (const persona of ["owner", "technician", "readonly", "admin"] as const)
    for (const id of [
      "trabajos",
      "administracion-ice24",
      "trabajo-detalle",
      "ice24-cuenta-detalle",
    ])
      test(`${persona} sin acciones internas en ${id}`, async ({ page }) => {
        await open(page, id, { id: persona, label: persona, demo: { persona } });
        const main = page.getByRole("main");
        await expect(main).toContainText("Sin permiso");
        await expect(main.locator("button,form,table")).toHaveCount(0);
        await expect(
          page
            .getByRole("navigation", { name: "Navegación principal" })
            .getByRole("link", { name: "Centro de trabajos", exact: true }),
        ).toHaveCount(0);
      });
  for (const id of [
    "trabajos",
    "administracion-ice24",
    "trabajo-detalle",
    "ice24-cuenta-detalle",
    "ice24-validacion-detalle",
    "ice24-modelo-detalle",
    "ice24-plantilla-detalle",
  ])
    for (const size of [
      { width: 375, zoom: 1 },
      { width: 768, zoom: 1 },
      { width: 1280, zoom: 2 },
      { width: 640, zoom: 1 },
    ])
      test(`${id} accesible a ${size.width}, zoom ${size.zoom}`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: 900 });
        await open(page, id);
        if (size.zoom === 2)
          await page.evaluate(() => {
            document.documentElement.style.zoom = "2";
          });
        await expect(page.locator("main#main-content")).toHaveCount(1);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        await expect(page).toHaveTitle(/ · ICE24 OS$/);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
          .toBe(true);
        expect(await seriousViolations(page)).toEqual([]);
        const controls = page
          .locator("main")
          .locator("button:visible, a:visible, select:visible, summary:visible");
        if (size.width === 375)
          expect(
            await controls.evaluateAll((elements) =>
              elements
                .filter((element) => element.getBoundingClientRect().height < 44)
                .map((element) => element.textContent),
            ),
          ).toEqual([]);
        const control = controls.first();
        await page.keyboard.press("Tab");
        await control.focus();
        expect(
          await control.evaluate((element) => getComputedStyle(element).outlineStyle),
        ).not.toBe("none");
        if (id.includes("detalle")) {
          await expect(page.locator("main")).toHaveAttribute("data-page-breadcrumbs", "true");
          await expect(page.getByRole("navigation", { name: "Ruta de navegación" })).toHaveCount(1);
        }
      });
  test("trabajos conserva filtros y devuelve el foco a la fila", async ({ page }) => {
    await open(page, "trabajos");
    await page.getByRole("combobox", { name: "Estado", exact: true }).selectOption("DEAD_LETTER");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page.locator("a[data-row-link]")).toHaveCount(1);
    await expect(page.locator("main")).toHaveAttribute("data-page-ready", "true");
    const href = await page.locator("a[data-row-link]").getAttribute("href");
    await page.getByRole("cell", { name: "5/5", exact: true }).click();
    await expect(page).toHaveURL(/\/jobs\/10000000/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Detalle del trabajo");
    await page.getByRole("link", { name: "Volver a trabajos" }).click();
    await expect(page.getByRole("combobox", { name: "Estado", exact: true })).toHaveValue(
      "DEAD_LETTER",
    );
    await expect(page.locator("a[data-row-link]")).toBeFocused();
    expect(await page.locator("a[data-row-link]").getAttribute("href")).toBe(href);
  });
  test("administración abre cuenta y versión por ruta y restaura el foco", async ({ page }) => {
    await open(page, "ice24-cuentas");
    await page.locator("a[data-row-link]").first().click();
    await expect(page).toHaveURL(/\/ice24\/cuentas\//);
    await expect(page.locator("main")).toHaveAttribute("data-page-ready", "true");
    await page.getByRole("link", { name: "Volver a administración" }).click();
    await expect(page.locator("a[data-row-link]").first()).toBeFocused();
    await page.getByRole("link", { name: "Catálogos y plantillas", exact: true }).click();
    await page.locator("a[data-row-link]").first().click();
    await page.locator("a[data-row-link]").first().click();
    await expect(page).toHaveURL(/\/ice24\/plantillas\//);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Detalle de plantilla");
    await page.getByRole("link", { name: "Volver a plantillas del modelo" }).click();
    await expect(page.locator("a[data-row-link]").first()).toBeFocused();
  });
  for (const id of ["trabajo-detalle", "ice24-cuenta-detalle"])
    test(`${id} impide escritura en modo lectura`, async ({ page }) => {
      await open(page, id, { ...normal, demo: { persona: "platform", mode: "READ_ONLY" } });
      if (id === "trabajo-detalle")
        await expect(page.getByRole("button", { name: "Reintentar trabajo" })).toBeDisabled();
      else {
        await page.locator("summary").filter({ hasText: "Datos de cuenta" }).click();
        await expect(page.locator("main button[type=submit]").first()).toBeDisabled();
      }
    });
});
