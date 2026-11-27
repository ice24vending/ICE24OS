import { expect, test, type Page } from "@playwright/test";
import {
  UI_QUALITY,
  UI_QUALITY_BASES,
  useReviewState,
  openReviewState,
} from "../../visual/review-page";
import { REVIEW_ROUTES, type ReviewState } from "../../visual/ux-review.routes";
import { seriousViolations } from "./axe";

const ids = ["ui-mnt-01", "ui-tkt-01", "archivos", "suscripcion", "machine-record-calendar"];
async function open(page: Page, id: string, state: ReviewState = { id: "normal", label: "Dueño" }) {
  const route = REVIEW_ROUTES.find((candidate) => candidate.id === id)!;
  await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
  await useReviewState(page.context(), route, state, UI_QUALITY_BASES.web);
  return openReviewState(
    page,
    route,
    id === "machine-record-calendar"
      ? { ...state, steps: [{ click: "Calendario", role: "tab" }] }
      : state,
    UI_QUALITY_BASES,
  );
}
test.describe("UXD-12 · Pulido", () => {
  for (const id of ids)
    for (const size of [
      { width: 375, zoom: 1 },
      { width: 1280, zoom: 2 },
      // Effective CSS viewport of a 1280 px display at 200% browser zoom.
      { width: 640, zoom: 1 },
      { width: 1440, zoom: 1 },
    ])
      test(`${id} accesible a ${size.width} y zoom ${size.zoom}`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: 900 });
        const result = await open(page, id);
        expect(result.problems).toEqual([]);
        if (size.zoom === 2)
          await page.evaluate(() => {
            document.documentElement.style.zoom = "2";
          });
        await expect(page.locator("main")).toHaveCount(1);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        await expect(page).toHaveTitle(/ · ICE24 OS$/);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
          .toBe(true)
          .catch(async (cause: unknown) => {
            const overflow = await page.evaluate(() =>
              Array.from(document.querySelectorAll("main *"))
                .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
                .slice(0, 12)
                .map((element) => ({
                  tag: element.tagName,
                  class: element.className,
                  right: element.getBoundingClientRect().right,
                })),
            );
            throw new Error(`${String(cause)} ${JSON.stringify(overflow)}`);
          });
        expect(await seriousViolations(page)).toEqual([]);
        const scope =
          id === "machine-record-calendar"
            ? page.locator(".maintenance-calendar")
            : page.locator("main");
        const control = scope.locator("button:visible, a:visible").first();
        await page.keyboard.press("Tab");
        await control.focus();
        expect(
          await control.evaluate((element) => getComputedStyle(element).outlineStyle),
        ).not.toBe("none");
        if (size.width === 375) {
          const small = await scope
            .locator("button:visible, select:visible, a:visible")
            .evaluateAll((elements) =>
              elements
                .filter((element) => element.getBoundingClientRect().height < 44)
                .map((element) => element.textContent),
            );
          expect(small).toEqual([]);
        }
      });
  test("changes the calendar view with one announcement and complete day content", async ({
    page,
  }) => {
    await open(page, "ui-mnt-01");
    await expect(page.getByRole("heading", { name: "Octubre de 2026", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Martes, 20 de octubre/ })).toBeVisible();
    await page.getByRole("button", { name: "Día", exact: true }).click();
    await expect(page.getByRole("status", { name: "Cambio de calendario" })).toHaveText(
      "Vista: Día. Martes, 20 de octubre de 2026.",
    );
    await expect(
      page.getByText("Vista: Día. Martes, 20 de octubre de 2026.", { exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("table", { name: "Actividades del día seleccionado" }),
    ).toBeVisible();
  });
  test("explains report prerequisites and styles the photo selector", async ({ page }) => {
    await open(page, "ui-tkt-01");
    await expect(page.getByRole("button", { name: "Elige primero la máquina" })).toBeDisabled();
    await expect(page.locator("#ticket-machine-help")).toHaveText("Elige primero la máquina");
    await page
      .getByRole("combobox", { name: "Máquina", exact: true })
      .selectOption("c0000000-0000-4000-8000-000000000001");
    await expect(page.getByRole("button", { name: "Seleccionar foto" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Elige el sistema" })).toBeDisabled();
  });
  for (const persona of ["owner", "technician", "readonly", "admin"] as const)
    test(`${persona}: file uploads and billing actions follow permissions`, async ({ page }) => {
      const state = { id: persona, label: persona, demo: { persona } };
      await open(page, "archivos", state);
      await expect(page.getByRole("region", { name: "Archivos de la cuenta" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Seleccionar archivo" })).toHaveCount(
        persona === "readonly" ? 0 : 1,
      );
      await open(page, "suscripcion", state);
      await expect(page.getByRole("button", { name: "Ver todas las facturas" })).toHaveCount(
        persona === "owner" ? 1 : 0,
      );
    });
  test("keeps the plan visible when the history fails and offers a local retry", async ({
    page,
  }) => {
    await open(page, "suscripcion", {
      id: "error",
      label: "Stripe no disponible",
      demo: { scenario: "conflict" },
    });
    await expect(page.getByRole("heading", { name: "Plan y acceso" })).toBeVisible();
    const history = page.getByRole("region", { name: "Historial de pagos" });
    await expect(history.getByText(/c0ffee00/)).toBeVisible();
    await history.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByRole("heading", { name: "Plan y acceso" })).toBeVisible();
    await expect(history.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });
  test("keeps payment history beside the plan within the UXD-00 width", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "suscripcion");
    const main = await page.locator("main").boundingBox();
    const plan = await page.locator(".subscription-card").boundingBox();
    const history = await page.locator(".subscription-history").boundingBox();
    expect(main!.width).toBeLessThanOrEqual(960);
    expect(history!.x).toBeGreaterThanOrEqual(plan!.x + plan!.width);
    expect(Math.abs(history!.y - plan!.y)).toBeLessThanOrEqual(1);
  });
  for (const width of [768, 1440])
    test(`file names and actions fit the table at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, "archivos");
      const table = page.getByRole("region", {
        name: "Documentos y evidencias de la cuenta",
        exact: true,
      });
      expect(
        await table.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBe(true);
    });
});
