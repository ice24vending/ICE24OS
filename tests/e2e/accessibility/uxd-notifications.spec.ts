import { expect, test, type Page } from "@playwright/test";
import { UI_QUALITY, UI_QUALITY_BASES, useReviewState } from "../../visual/review-page";
import { REVIEW_ROUTES, type ReviewState } from "../../visual/ux-review.routes";
import { demoIds } from "../../../apps/private-web/src/server/demo/fixtures";
import { seriousViolations } from "./axe";

const route = REVIEW_ROUTES.find((item) => item.id === "avisos")!;
const owner: ReviewState = { id: "normal", label: "Dueño" };
const announcement: ReviewState = {
  id: "alerta",
  label: "Alerta crítica",
  demo: { maintenance: "alert-announcement" },
};
const detail = `/notifications/${demoIds.notification(3)}`;

async function open(page: Page, path: string, state: ReviewState = owner) {
  await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
  await useReviewState(page.context(), route, state, UI_QUALITY_BASES.web);
  await page.goto(path);
  await expect(page.locator(`main#main-content[data-page-ready="true"]`)).toHaveCount(1);
}
const reads = (page: Page) => {
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/api\/notifications\/[^/]+\/read$/u.test(request.url()))
      sent.push(request.url());
  });
  return sent;
};

test.describe("UXD-05 · Avisos", () => {
  for (const size of [
    { width: 375, zoom: 1 },
    { width: 1280, zoom: 2 },
    { width: 1440, zoom: 1 },
  ])
    for (const [path, title] of [
      ["/notifications", "Avisos · ICE24 OS"],
      [detail, /^Mantenimiento próximo: .+ · ICE24 OS$/u],
      [`/notifications/${demoIds.notification(999)}`, "Aviso · ICE24 OS"],
    ] as const)
      test(`${path} accesible a ${size.width} y zoom ${size.zoom}`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: 900 });
        await open(page, path);
        if (size.zoom === 2)
          await page.evaluate(() => {
            document.documentElement.style.zoom = "2";
          });
        await expect(page).toHaveTitle(title);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        await expect
          .poll(() =>
            page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          )
          .toBe(true);
        expect(await seriousViolations(page)).toEqual([]);
        if (size.width === 375) {
          const small = await page
            .locator("main button:visible, main a:visible")
            .evaluateAll((elements) =>
              elements
                .filter((el) => el.getBoundingClientRect().height < 44)
                .map((el) => el.textContent),
            );
          expect(small).toEqual([]);
        }
      });

  test("from 1280 px the detail opens beside the list without leaving the page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const sent = reads(page);
    await open(page, "/notifications");
    const panel = page.getByRole("complementary", { name: "Detalle del aviso" });
    await expect(panel).toContainText("Elige un aviso para ver su detalle");
    await page.getByRole("link", { name: "Ver detalle" }).first().click();
    await expect(page).toHaveURL(/\/notifications$/u);
    await expect(panel.getByRole("heading", { name: "Detalle del aviso" })).toBeFocused();
    await expect(panel).toContainText("Ocurrió");
    // Nothing is marked read until a person opens an unread alert.
    expect(sent.length).toBeLessThanOrEqual(1);
  });

  test("below 1024 px «Ver detalle» opens the route and «Volver» restores filter and focus", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const prefetched: string[] = [];
    page.on("request", (request) => {
      if (/\/notifications\/[0-9a-f-]{36}/u.test(request.url())) prefetched.push(request.url());
    });
    await open(page, "/notifications?filtro=resueltas");
    await expect(page.getByRole("complementary", { name: "Detalle del aviso" })).toHaveCount(0);
    // A plain link: the detail is never prefetched, so it cannot be marked read in advance.
    expect(prefetched).toEqual([]);
    const link = page.getByRole("link", { name: "Ver detalle" }).first();
    const id = await link.getAttribute("id");
    await link.click();
    await expect(page).toHaveURL(/\/notifications\/[0-9a-f-]{36}\?filtro=resueltas$/u);
    await expect(page.locator(`main#main-content[data-page-ready="true"]`)).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: /migas|ruta/iu })).toContainText("Avisos");
    await page.getByRole("link", { name: "Volver a avisos" }).click();
    await expect(page).toHaveURL(/\/notifications\?filtro=resueltas$/u);
    await expect(page.locator(`[id="${id}"]`)).toBeFocused();
  });

  test("the KPIs filter the list and the active one is current, not only colored", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "/notifications", announcement);
    await page.getByRole("link", { name: /^Críticas sin enterado/u }).click();
    await expect(page).toHaveURL(/filtro=criticas-sin-enterado/u);
    await expect(page.locator(`main#main-content[data-page-ready="true"]`)).toHaveCount(1);
    await expect(page.getByRole("link", { name: /^Críticas sin enterado/u })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page.getByText("Filtrando: críticas sin enterado")).toBeVisible();
    await expect(page.locator("#pinned-heading")).toHaveCount(0);
    await page.getByRole("button", { name: "Quitar filtro" }).click();
    await expect(page).toHaveURL(/\/notifications$/u);
    await expect(page.locator('main [aria-current="true"]')).toHaveCount(0);
  });

  for (const width of [1440, 768])
    test(`«Marcar enterado» is announced once and keeps focus (SR-05 C6) at ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, "/notifications", announcement);
      const region = page.locator(".alert-message");
      await expect(region).toHaveText("");
      const original = await region.elementHandle();
      await page.getByRole("button", { name: "Marcar enterado" }).first().click();
      await expect(region).toContainText("El cambio quedó auditado");
      expect(await original!.evaluate((node) => node.isConnected)).toBe(true);
      // The confirmation lives in one region only.
      await expect(page.getByRole("status").filter({ hasText: "quedó auditado" })).toHaveCount(1);
      expect(
        await page.evaluate(
          () => document.activeElement !== document.body && document.activeElement?.closest("main"),
        ),
      ).toBeTruthy();
    });

  test("a read-only account opens the detail without trying to mark it read", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const sent = reads(page);
    await open(page, `/notifications/${demoIds.notification(2)}`, {
      id: "lectura",
      label: "Lectura",
      demo: { mode: "READ_ONLY" },
    });
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Aviso");
    expect(sent).toEqual([]);
  });

  for (const persona of ["technician", "readonly", "admin"] as const)
    test(`${persona} sees the center and detail without forbidden actions`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(page, "/notifications", { id: persona, label: persona, demo: { persona } });
      await expect(page.locator('[data-state="forbidden"]')).toHaveCount(0);
      await expect(page.getByRole("link", { name: /^En atención/u })).toBeVisible();
      await page.goto(detail);
      await expect(page.locator(`main#main-content[data-page-ready="true"]`)).toHaveCount(1);
      await expect(page.locator('[data-state="forbidden"]')).toHaveCount(0);
    });
});
