import { expect, test, type Page } from "@playwright/test";
import {
  UI_QUALITY,
  UI_QUALITY_BASES,
  useReviewState,
  openReviewState,
} from "../../visual/review-page";
import { REVIEW_ROUTES, type ReviewState } from "../../visual/ux-review.routes";
import { DEMO_ACCOUNTS } from "../../../apps/private-web/src/server/demo/fixtures";
import { seriousViolations } from "./axe";
const route = REVIEW_ROUTES.find((item) => item.id === "maquinas")!;
const machines = DEMO_ACCOUNTS.polar.machines;
async function open(page: Page, path = "/machines", state: ReviewState = route.states[0]!) {
  await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
  await useReviewState(page.context(), route, state, UI_QUALITY_BASES.web);
  await page.goto(path);
  await expect(page.locator("main#main-content")).toHaveAttribute("data-page-ready", "true");
}
test.describe("UXD-03 · Máquinas", () => {
  for (const size of [
    { width: 375, zoom: 1 },
    { width: 1280, zoom: 2 },
    { width: 1440, zoom: 1 },
  ])
    for (const view of ["lista", "bloques"])
      test(`${view} accesible a ${size.width} y zoom ${size.zoom}`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: 900 });
        await open(page, `/machines?vista=${view}`);
        if (size.zoom === 2)
          await page.evaluate(() => {
            document.documentElement.style.zoom = "2";
          });
        await expect(page).toHaveTitle("Máquinas · ICE24 OS");
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        await expect(page.locator("main")).toHaveCount(1);
        await expect
          .poll(() =>
            page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          )
          .toBe(true);
        expect(await seriousViolations(page)).toEqual([]);
        const link = page.locator("main a[data-row-link]").first();
        await link.focus();
        expect(await link.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
        await expect(link).toHaveAttribute("href", /^\/machines\/[0-9a-f-]+$/);
        if (size.width === 375) {
          const small = await page
            .locator(
              "main button:visible, main input:not([type=radio]):visible, main select:visible, main a:visible",
            )
            .evaluateAll((elements) =>
              elements
                .filter((el) => el.getBoundingClientRect().height < 44)
                .map((el) => el.textContent),
            );
          expect(small).toEqual([]);
        }
      });
  test("combines filters, sorts every column and announces changes only once", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    for (const column of [
      "Folio",
      "Nombre",
      "Sucursal",
      "Estado operativo",
      "Último mantenimiento",
      "Próximo mantenimiento",
      "Tickets abiertos",
    ]) {
      const header = page
        .getByRole("columnheader")
        .filter({ has: page.getByRole("button", { name: new RegExp(column) }) });
      await header.getByRole("button").click();
      await expect(header).toHaveAttribute("aria-sort", /ascending|descending/);
    }
    await page.getByRole("searchbox", { name: "Buscar máquinas" }).fill("juarez");
    await expect(page).toHaveURL(/q=juarez/);
    await page
      .getByRole("combobox", { name: "Sucursal", exact: true })
      .selectOption(machines[0]!.branchId);
    await expect(page).toHaveURL(/sucursalFiltro=/);
    await page
      .getByRole("combobox", { name: "Estado operativo", exact: true })
      .selectOption("available");
    await expect(page).toHaveURL(/estado=available/);
    await expect(page.locator("main a[data-row-link]")).toHaveCount(1);
    const announcement = page.getByRole("status", { name: "Cambio de vista" });
    await expect(announcement).toBeEmpty();
    await page.getByRole("radio", { name: "Bloques", exact: true }).check();
    await expect(page).toHaveURL(/vista=bloques/);
    await expect(announcement).toHaveText("Vista de bloques.");
    await expect(page.getByText("Vista de bloques.", { exact: true })).toHaveCount(1);
    await expect(page.getByRole("link", { name: machines[0]!.name, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("radio", { name: "Bloques", exact: true })).toBeChecked();
    await expect(announcement).toBeEmpty();
    await page.getByRole("radio", { name: "Lista", exact: true }).check();
    await expect(announcement).toHaveText("Vista de lista.");
    await expect(page.locator(".machine-record")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ver / editar" })).toHaveCount(0);
  });
  for (const persona of ["owner", "admin", "technician", "readonly"] as const)
    test(`preserves scope, request access and legacy record for ${persona}`, async ({ page }) => {
      await open(page, "/machines", { id: persona, label: persona, demo: { persona } });
      const allowed = machines.filter(
        (row) => ["owner", "readonly"].includes(persona) || row.branchId === machines[0]!.branchId,
      );
      await expect(page.locator("main a[data-row-link]")).toHaveCount(allowed.length);
      await expect(page.getByRole("button", { name: "Ver / editar" })).toHaveCount(0);
      if (persona === "admin" || persona === "technician")
        await expect(
          page.getByRole("main").getByRole("option", { name: "Cumbres", exact: true }),
        ).toHaveCount(0);
      await page.getByRole("button", { name: "Solicitudes", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Solicitudes", exact: true })).toBeVisible();
      if (persona !== "owner")
        await expect(page.getByRole("button", { name: /Guardar|Enviar a revisión/ })).toHaveCount(
          0,
        );
      await page.getByRole("button", { name: "Máquinas", exact: true }).click();
      await expect(page.locator("main a[data-row-link]")).toHaveCount(allowed.length);
      await page.goto(`/machines?machineId=${machines[0]!.id}`);
      await expect(page.locator(".machine-record")).toBeFocused();
      await expect(page.getByRole("tablist", { name: "Secciones del expediente" })).toBeVisible();
    });
  for (const state of route.states.filter((state) =>
    ["carga", "vacio", "error", "offline", "lectura"].includes(state.id),
  ))
    test(`distinguishes ${state.label}`, async ({ page }) => {
      await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
      await useReviewState(page.context(), route, state, UI_QUALITY_BASES.web);
      const { problems } = await openReviewState(page, route, state, UI_QUALITY_BASES);
      expect(problems).toEqual([]);
      expect(await seriousViolations(page)).toEqual([]);
      if (state.id === "carga")
        await expect(page.locator("main")).toHaveAttribute("data-page-ready", "false");
      if (state.id === "error")
        await expect(page.getByText("c0ffee00-0000-4000-8000-0000000003e7")).toBeVisible();
      if (["carga", "error", "offline"].includes(state.id))
        await expect(page.getByText("Sin máquinas", { exact: true })).toHaveCount(0);
      if (state.id === "vacio")
        await expect(page.getByText("Sin máquinas", { exact: true })).toBeVisible();
    });
});
