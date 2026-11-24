import { expect, test, type Page } from "@playwright/test";
import {
  UI_QUALITY,
  UI_QUALITY_BASES,
  useReviewState,
  openReviewState,
} from "../../visual/review-page";
import { REVIEW_ROUTES, type ReviewState } from "../../visual/ux-review.routes";
import { seriousViolations } from "./axe";
const list = REVIEW_ROUTES.find((route) => route.id === "tickets-list")!;
const detail = REVIEW_ROUTES.find((route) => route.id === "ui-tkt-02")!;
const machine = "c0000000-0000-4000-8000-000000000001";
async function open(page: Page, path = list.path, state: ReviewState = list.states[0]!) {
  await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
  await useReviewState(page.context(), list, state, UI_QUALITY_BASES.web);
  await page.goto(path);
  await expect(page.locator("main#main-content")).toHaveAttribute("data-page-ready", "true");
}
test.describe("UXD-07 · Tickets", () => {
  for (const route of [list, detail])
    for (const size of [
      { width: 375, zoom: 1 },
      { width: 1280, zoom: 2 },
      { width: 1440, zoom: 1 },
    ])
      test(`${route.id} accesible a ${size.width} y zoom ${size.zoom}`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: 900 });
        await open(page, route.path);
        if (size.zoom === 2)
          await page.evaluate(() => {
            document.documentElement.style.zoom = "2";
          });
        await expect(page).toHaveTitle(
          `${route === list ? "Tickets de mantenimiento" : "Detalle del ticket"} · ICE24 OS`,
        );
        await expect(page.locator("main")).toHaveCount(1);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
          .toBe(true)
          .catch(async (cause: unknown) => {
            const overflow = await page.evaluate(() =>
              Array.from(document.querySelectorAll("body *"))
                .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
                .slice(0, 20)
                .map((el) => ({
                  tag: el.tagName,
                  class: el.className,
                  right: el.getBoundingClientRect().right,
                  width: el.getBoundingClientRect().width,
                })),
            );
            throw new Error(`${String(cause)}\nOverflow: ${JSON.stringify(overflow)}`);
          });
        expect(await seriousViolations(page)).toEqual([]);
        if (route === list) {
          await expect
            .poll(() =>
              page.locator(".ids-table__scroll").evaluate((el) => el.scrollWidth <= el.clientWidth),
            )
            .toBe(true);
          const navigation = await page
            .getByRole("navigation", { name: "Mantenimiento", exact: true })
            .boundingBox();
          const summary = await page
            .getByRole("region", { name: "Resumen de tickets" })
            .boundingBox();
          expect(navigation!.y + navigation!.height).toBeLessThanOrEqual(summary!.y);
        }
        const link = page.locator("main a:visible").first();
        await link.focus();
        expect(await link.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
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
  test("retains incoming machine, history and filter links, marks KPI and clears filters", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, `${list.path}?machineId=${machine}`);
    await expect(page.getByRole("combobox", { name: "Máquina", exact: true })).toHaveValue(machine);
    await expect(page.getByRole("region", { name: "Filtros activos" })).toContainText(
      "Máquina: ICE24-MTY-0001",
    );
    await page.getByRole("combobox", { name: "Prioridad", exact: true }).selectOption("high");
    await expect(page).toHaveURL(/priority=high/);
    await page.getByRole("link", { name: "TKT-000001", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Detalle del ticket", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Volver a tickets", exact: true }).click();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === list.path &&
        url.searchParams.get("machineId") === machine &&
        url.searchParams.get("priority") === "high",
    );
    await expect(page.locator("main#main-content")).toHaveAttribute("data-page-ready", "true");
    await page.getByRole("link", { name: /^Abiertos/ }).click();
    await expect(page.locator('main a[aria-current="true"]')).toContainText("Filtro activo");
    await page.getByRole("button", { name: "Quitar filtros", exact: true }).click();
    await expect(page).not.toHaveURL(/machineId=|metric=|priority=/);
    await page.goBack();
    await expect(page).toHaveURL(/metric=open/);
  });
  test("paginates without shrinking KPI and announces a view change once", async ({ page }) => {
    await open(page, `${list.path}?limit=1`);
    await expect(page.getByRole("link", { name: "TKT-000003", exact: true })).toBeVisible();
    const kpi = await page.getByRole("region", { name: "Resumen de tickets" }).textContent();
    await page.getByRole("link", { name: "Más tickets" }).click();
    await expect(page.locator("main#main-content")).toHaveAttribute("data-page-ready", "true");
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.get("sort") === "recent" &&
        !!url.searchParams.get("cursor")?.includes("|"),
    );
    await expect(page.getByRole("link", { name: "TKT-000007", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Resumen de tickets" })).toHaveText(kpi!);
    await page.getByRole("radio", { name: "Bloques", exact: true }).check();
    await expect(page.getByRole("status", { name: "Cambio de vista" })).toHaveText(
      "Vista de bloques.",
    );
    await expect(page.getByText("Vista de bloques.", { exact: true })).toHaveCount(1);
    await page.reload();
    await expect(page.getByRole("status", { name: "Cambio de vista" })).toBeEmpty();
  });
  for (const persona of ["owner", "technician", "readonly", "admin"] as const)
    test(`actions and scope for ${persona}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(page, list.path, { id: persona, label: persona, demo: { persona } });
      await expect(page.getByRole("link", { name: "Reportar una falla", exact: true })).toHaveCount(
        persona === "readonly" ? 0 : 1,
      );
      if (["admin", "technician"].includes(persona))
        await expect(
          page.getByRole("main").getByRole("option", { name: "Cumbres", exact: true }),
        ).toHaveCount(0);
      await page.getByRole("link", { name: "TKT-000001", exact: true }).click();
      await expect(page.locator("main#main-content")).toHaveAttribute("data-page-ready", "true");
      await expect(
        page.getByRole("button", { name: "Guardar diagnóstico", exact: true }),
      ).toHaveCount(persona === "readonly" ? 0 : 1);
      await expect(page.getByRole("link", { name: "Asignar técnico", exact: true })).toHaveCount(
        ["owner", "admin"].includes(persona) ? 1 : 0,
      );
    });
  for (const route of [list, detail])
    for (const state of route.states.filter((state) =>
      ["carga", "vacio", "error", "offline", "lectura"].includes(state.id),
    ))
      test(`${route.id} distingue ${state.id}`, async ({ page }) => {
        await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
        await useReviewState(page.context(), route, state, UI_QUALITY_BASES.web);
        const { problems } = await openReviewState(page, route, state, UI_QUALITY_BASES);
        expect(problems).toEqual([]);
        expect(await seriousViolations(page)).toEqual([]);
        await expect(page.locator("main")).toHaveAttribute(
          "data-page-ready",
          state.id === "carga" ? "false" : "true",
        );
        if (state.id === "error")
          await expect(page.getByText("c0ffee00-0000-4000-8000-0000000003e7")).toBeVisible();
        if (state.id === "lectura") {
          await expect(page.getByRole("button", { name: "Guardar diagnóstico" })).toHaveCount(0);
          await expect(page.getByRole("link", { name: "Asignar técnico" })).toHaveCount(0);
        }
      });
});
