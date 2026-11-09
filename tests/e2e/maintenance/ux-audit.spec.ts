import { expect, test } from "@playwright/test";
import {
  DEMO_COOKIE,
  defaultDemoState,
  encodeDemoState,
} from "../../../apps/private-web/src/server/demo/state";
import { seriousViolations } from "../accessibility/axe";
import { UI_QUALITY_BASES } from "../../visual/review-page";

for (const width of [375, 768, 1280, 1440])
  test.describe(`maintenance UX ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    test("calendar modes, period navigation, keyboard and action hierarchy", async ({
      page,
      context,
      baseURL,
    }, testInfo) => {
      await context.addCookies([
        {
          name: DEMO_COOKIE,
          value: encodeDemoState(defaultDemoState()),
          url: baseURL!,
          httpOnly: true,
        },
      ]);
      await page.goto("/maintenance?view=calendar");
      const calendar = page.getByRole("region", { name: "Calendario de actividades" });
      await expect(calendar.locator("[data-calendar-day]")).toHaveCount(42);
      await testInfo.attach(`calendar-${width}`, {
        body: await page.screenshot({ fullPage: true, caret: "initial" }),
        contentType: "image/png",
      });
      await calendar.getByRole("button", { name: "Periodo siguiente" }).click();
      await calendar.getByRole("button", { name: "Hoy", exact: true }).click();
      const selected = calendar.locator('[data-calendar-day][aria-pressed="true"]');
      const oldDay = await selected.getAttribute("data-calendar-day");
      await selected.focus();
      await page.keyboard.press("ArrowRight");
      await expect(selected).not.toHaveAttribute("data-calendar-day", oldDay!);
      await calendar.getByRole("button", { name: "Semana", exact: true }).click();
      await expect(calendar.locator("[data-calendar-day]")).toHaveCount(7);
      await calendar.getByRole("button", { name: "Día", exact: true }).click();
      await expect(calendar.getByRole("region", { name: "Actividades del día" })).toBeVisible();
      await calendar.getByRole("button", { name: "Mes", exact: true }).click();
      // Measure full targets, rather than a link partly clipped beneath the sticky header
      // after Playwright scrolls the calendar controls into view.
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(await seriousViolations(page)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page
        .getByRole("navigation", { name: "Mantenimiento", exact: true })
        .getByRole("link", { name: "Lista", exact: true })
        .click();
      await expect(page.locator('.ids-navigation-tabs [aria-current="page"]')).toHaveText("Lista");
      await expect(page.locator(".ids-table .ids-button--primary")).toHaveCount(0);
      const closed = page
        .locator("tr")
        .filter({ has: page.getByText("Completada", { exact: true }) });
      await expect(closed.first()).toBeVisible();
      await expect(closed.getByRole("link", { name: "Asignar técnico" })).toHaveCount(0);
      expect(await seriousViolations(page)).toEqual([]);
    });
  });

test("button and link text retain AA contrast through interaction states", async ({ page }) => {
  await page.goto(
    `${UI_QUALITY_BASES.storybook}/iframe.html?id=base-button--estados-interactivos&viewMode=story`,
  );
  await expect(page.getByRole("button", { name: "Acción primary", exact: true })).toBeVisible();
  async function ratio(selector: string) {
    return page.locator(selector).evaluate((el) => {
      const style = getComputedStyle(el);
      const rgb = (value: string) =>
        value
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number);
      const lum = (color: number[]) =>
        color
          .map((v) => {
            const n = v / 255;
            return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
      let parent: Element | null = el;
      let bg = style.backgroundColor;
      while (parent && (bg === "transparent" || bg === "rgba(0, 0, 0, 0)")) {
        parent = parent.parentElement;
        if (parent) bg = getComputedStyle(parent).backgroundColor;
      }
      const a = lum(rgb(style.color)),
        b = lum(bg === "rgba(0, 0, 0, 0)" ? [255, 255, 255] : rgb(bg));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
  }
  for (const variant of ["primary", "secondary", "tertiary", "danger"]) {
    for (const tag of ["button:not(:disabled)", "a"]) {
      const selector = `${tag}.ids-button--${variant}`;
      const control = page.locator(selector);
      for (const state of ["default", "hover", "focus", "active"]) {
        if (state === "default" || state === "focus") await page.mouse.move(0, 0);
        if (state === "hover") await control.hover();
        if (state === "focus") await control.focus();
        if (state === "active") {
          await control.hover();
          await page.mouse.down();
        }
        await page.evaluate(() =>
          Promise.allSettled(document.getAnimations().map((a) => a.finished)),
        );
        expect(await ratio(selector), `${variant} ${tag} ${state}`).toBeGreaterThanOrEqual(4.5);
        if (state === "active") await page.mouse.up();
      }
    }
    expect(await ratio(`button:disabled.ids-button--${variant}`)).toBeGreaterThanOrEqual(4.5);
  }
});
