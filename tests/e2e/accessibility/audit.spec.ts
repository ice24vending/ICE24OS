import { expect, test, type Page } from "@playwright/test";
import { useReviewState, UI_QUALITY, UI_QUALITY_BASES } from "../../visual/review-page";
import { REVIEW_ROUTES } from "../../visual/ux-review.routes";
import { seriousViolations } from "./axe";
import { demoIds } from "../../../apps/private-web/src/server/demo/fixtures";

const route = REVIEW_ROUTES.find((item) => item.id === "auditoria")!;
test.beforeEach(async ({ page, context }) => {
  await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
  await useReviewState(context, route, { id: "normal", label: "Dueño" }, UI_QUALITY_BASES.web);
});
const ready = async (page: Page) => {
  await expect(page.locator("#main-content")).toHaveAttribute("data-page-ready", "true");
};

test("Auditoría UXD-10 · lista → detalle → correlación → volver", async ({ page }) => {
  await page.goto("/audit?result=SUCCESS");
  await ready(page);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByText("Página 2", { exact: true })).toBeVisible();
  const original = page.url();
  // The older machine change and its recalculation share one correlation.
  await page.locator(`#audit-${demoIds.audit(12)}`).click();
  await ready(page);
  await expect(page).toHaveURL(new RegExp(`/audit/${demoIds.audit(12)}\\?`));
  await expect(page).toHaveTitle("Detalle de auditoría · ICE24 OS");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  for (const text of ["Fecha local", "Fecha UTC", "Dirección IP", "Antes", "Después"])
    await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  await expect(page.getByRole("link", { name: "Volver a auditoría" })).toHaveAttribute(
    "href",
    new URL(original).pathname + new URL(original).search,
  );
  await page.getByRole("link", { name: "Ver todos los eventos de esta correlación" }).click();
  await ready(page);
  expect(new URL(page.url()).searchParams.get("correlation")).toBe(demoIds.correlation(12));
  expect(new URL(page.url()).searchParams.has("result")).toBe(false);
  await expect(page.locator("#main-content [data-row-link]")).toHaveCount(2);
  await expect(page.locator(`#audit-${demoIds.audit(12)}`)).toBeVisible();
  await expect(page.locator(`#audit-${demoIds.audit(13)}`)).toBeVisible();
  await page.getByRole("link", { name: "Volver a la lista" }).click();
  await ready(page);
  await expect(page).toHaveURL(original);
  await expect(page.getByText("Página 2", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Estado", { exact: true })).toHaveValue("SUCCESS");
  await page.reload();
  await ready(page);
  await expect(page.getByText("Página 2", { exact: true })).toBeVisible();
});

test("Auditoría UXD-10 · permiso y no disponible sin revelar existencia", async ({
  page,
  context,
}) => {
  const bodies: string[] = [];
  for (const id of [demoIds.audit(999), demoIds.audit(101)]) {
    await page.goto(`/audit/${id}?origen=https://example.org`);
    await ready(page);
    await expect(page.getByRole("heading", { name: "Evento no disponible" })).toBeVisible();
    bodies.push(await page.locator("#main-content").innerText());
    await expect(page.getByRole("link", { name: "Volver a auditoría" })).toHaveAttribute(
      "href",
      "/audit",
    );
  }
  expect(bodies[0]).toBe(bodies[1]);
  for (const persona of ["technician", "admin", "readonly"] as const) {
    await useReviewState(
      context,
      route,
      { id: persona, label: persona, demo: { persona } },
      UI_QUALITY_BASES.web,
    );
    await page.goto(`/audit/${demoIds.audit(1)}`);
    await ready(page);
    if (persona === "readonly") {
      await expect(
        page.getByRole("link", { name: "Ver todos los eventos de esta correlación" }),
      ).toBeVisible();
      await expect(page.locator("#main-content button")).toHaveCount(0);
    } else {
      await expect(
        page.getByRole("link", { name: "Ver todos los eventos de esta correlación" }),
      ).toHaveCount(0);
      await expect(page.locator('#main-content [data-state="forbidden"]')).toBeVisible();
      await page.goto("/audit");
      await expect(page.getByRole("form", { name: "Filtros de auditoría" })).toHaveCount(0);
    }
  }
});

for (const width of [375, 640])
  test(`Auditoría UXD-10 · accesibilidad y reflujo ${width}`, async ({ page }) => {
    // 640 CSS px is the layout viewport of a 1280 px display at 200% browser zoom.
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/audit");
    await ready(page);
    await expect(page).toHaveTitle("Auditoría · ICE24 OS");
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
    const dropdown = page.getByLabel("Tipo de evento", { exact: true });
    await dropdown.focus();
    expect(await dropdown.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
      "none",
    );
    await dropdown.selectOption("FREQUENCY_OVERRIDE_CREATED");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page.locator("#main-content [data-row-link]")).toHaveCount(1);
    expect(await seriousViolations(page)).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    for (const control of await page
      .locator(
        "#main-content button:visible, #main-content select:visible, #main-content input:visible",
      )
      .all()) {
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    await page.locator("#main-content [data-row-link]").focus();
    await page.keyboard.press("Enter");
    await ready(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Detalle de auditoría");
    expect(await seriousViolations(page)).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const back = await page.getByRole("link", { name: "Volver a auditoría" }).boundingBox();
    expect(back?.height).toBeGreaterThanOrEqual(44);
  });
