import { expect, test, type Page } from "@playwright/test";
import { UI_QUALITY, UI_QUALITY_BASES, useReviewState } from "../../visual/review-page";
import { REVIEW_ROUTES, type ReviewState } from "../../visual/ux-review.routes";
import { seriousViolations } from "./axe";
import { DEMO_ACCOUNTS } from "../../../apps/private-web/src/server/demo/fixtures";
const route = REVIEW_ROUTES.find((r) => r.id === "sucursales")!;
const branch = DEMO_ACCOUNTS.polar.branches[0]!;
async function open(
  page: Page,
  path = "/branches",
  state: ReviewState = { id: "normal", label: "Dueño" },
) {
  await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
  await useReviewState(page.context(), route, state, UI_QUALITY_BASES.web);
  await page.goto(path);
  await expect(page.locator("#main-content")).toHaveAttribute("data-page-ready", "true");
}
test.describe("UXD-02 · Sucursales", () => {
  for (const size of [
    { width: 375, zoom: 1 },
    { width: 1280, zoom: 2 },
    { width: 1440, zoom: 1 },
  ])
    for (const screen of [
      { path: "/branches", title: "Sucursales" },
      { path: "/branches/new", title: "Nueva sucursal" },
      { path: `/branches/${branch.id}`, title: "Detalle de sucursal" },
    ])
      test(`${screen.title} accesible a ${size.width} y zoom ${size.zoom}`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: 900 });
        await open(page, screen.path);
        if (size.zoom === 2)
          await page.evaluate(() => {
            document.documentElement.style.zoom = "2";
          });
        await expect(page).toHaveTitle(`${screen.title} · ICE24 OS`);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        await expect(page.locator("main")).toHaveCount(1);
        await expect
          .poll(() =>
            page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          )
          .toBe(true);
        expect(await seriousViolations(page)).toEqual([]);
        if (size.width === 375) {
          const small = await page
            .locator(
              "main button:visible, main input:not([type=checkbox]):visible, main select:visible, main a:visible",
            )
            .evaluateAll((elements) =>
              elements
                .filter((el) => el.getBoundingClientRect().height < 44)
                .map((el) => el.textContent || el.getAttribute("aria-label")),
            );
          expect(small).toEqual([]);
        }
      });
  test("preserves view and filters and returns focus to the row once", async ({ page }) => {
    await open(page, "/branches?q=Centro&vista=lista");
    await page.getByRole("radio", { name: "Bloques" }).check();
    await expect(page).toHaveURL(/vista=bloques/);
    await expect(page.getByRole("status", { name: "Cambio de vista" })).toHaveText(
      "Vista de bloques.",
    );
    await expect(page.getByText("Vista de bloques.", { exact: true })).toHaveCount(1);
    await page.getByRole("link", { name: branch.name, exact: true }).click();
    await page.getByRole("link", { name: "Volver a Sucursales" }).click();
    await expect(page).toHaveURL(/q=Centro.*vista=bloques/);
    await expect(page.getByRole("link", { name: branch.name, exact: true })).toBeFocused();
    await expect(page).not.toHaveURL(/volverA=/);
    await expect(page.getByRole("status", { name: "Cambio de vista" })).toBeEmpty();
  });
  for (const persona of ["admin", "technician", "readonly"] as const)
    test(`restricts actions and reach for ${persona}`, async ({ page }) => {
      const state = { id: persona, label: persona, demo: { persona } };
      await open(page, "/branches", state);
      await expect(page.getByRole("link", { name: "Nueva sucursal" })).toHaveCount(0);
      if (persona === "admin") {
        await expect(page.getByRole("link", { name: branch.name, exact: true })).toHaveCount(1);
        await expect(page.getByRole("link", { name: "Cumbres", exact: true })).toHaveCount(0);
        await expect(page.locator("main").getByText("Jorge Salinas", { exact: true })).toHaveCount(
          0,
        );
        await expect(page.getByText("Asignado", { exact: true })).toBeVisible();
      }
      await page.goto(`/branches/${branch.id}`);
      await expect(page.locator("#main-content")).toHaveAttribute("data-page-ready", "true");
      await expect(page.getByRole("button", { name: "Editar", exact: true })).toHaveCount(0);
      await page.goto("/branches/new");
      await expect(page.getByRole("button", { name: "Crear sucursal" })).toHaveCount(0);
    });
  test("creates, edits and protects unsaved data through the API", async ({ page }) => {
    await open(page, "/branches/new");
    await page.getByLabel(/^Nombre/).fill("Sucursal prueba");
    await page.getByLabel("Código", { exact: true }).fill("PRUEBA-01");
    await page.getByLabel(/^Dirección/).fill("Av. Universidad 180");
    await page.getByLabel("Ciudad", { exact: true }).fill("Monterrey");
    await page.getByLabel("Entidad federativa", { exact: true }).fill("Nuevo León");
    await page.getByLabel(/^Latitud/).fill("25.68");
    await page.getByLabel(/^Longitud/).fill("-100.31");
    await page.getByLabel("Notas", { exact: true }).fill("Acceso por el estacionamiento");
    await page.getByRole("link", { name: "Cancelar", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Seguir editando", exact: true }).click();
    await page.getByRole("button", { name: "Crear sucursal", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sucursal prueba");
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByLabel(/^Nombre/).fill("Sucursal prueba editada");
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sucursal prueba editada");
    await expect(page.locator("dd").filter({ hasText: "PRUEBA-01" })).toBeVisible();
    await expect(page.getByText("Acceso por el estacionamiento", { exact: true })).toBeVisible();
  });
  test("keeps written notes on a version conflict", async ({ page }) => {
    await open(page, `/branches/${branch.id}`, {
      id: "conflict",
      label: "Conflicto",
      demo: { scenario: "conflict" },
    });
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByLabel("Notas", { exact: true }).fill("No perder estas notas");
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await expect(page.getByText("Tus cambios siguen en el formulario")).toBeVisible();
    await expect(page.getByLabel("Notas", { exact: true })).toHaveValue("No perder estas notas");
  });
});
