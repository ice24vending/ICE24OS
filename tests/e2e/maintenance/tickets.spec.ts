import { expect, test } from "@playwright/test";
import {
  DEMO_COOKIE,
  defaultDemoState,
  encodeDemoState,
} from "../../../apps/private-web/src/server/demo/state";
import { seriousViolations } from "../accessibility/axe";
import { reportTicketWithPhoto } from "./ticket-photo-flow";
import { demoIds } from "../../../apps/private-web/src/server/demo/fixtures";
import { UI_QUALITY } from "../../visual/review-page";

test("ticket retry keeps values and key; navigation and offline protect pending input", async ({
  page,
  context,
  baseURL,
}) => {
  await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
  await context.addCookies([
    {
      name: DEMO_COOKIE,
      value: encodeDemoState(defaultDemoState()),
      url: baseURL!,
      httpOnly: true,
    },
  ]);
  const keys: string[] = [];
  await page.route("**/api/tickets", async (route) => {
    const r = route.request();
    const form = await new Request(r.url(), {
      method: "POST",
      headers: r.headers(),
      body: new Uint8Array(r.postDataBuffer()!),
    }).formData();
    keys.push(String(form.get("key")));
    await route.fulfill({
      status: 503,
      json: { message: "El servicio no está disponible. Conservamos tus datos." },
    });
  });
  await page.goto("/maintenance/tickets/new");
  await page.getByLabel("Máquina", { exact: true }).selectOption(demoIds.machine(1));
  await page.getByLabel("Sistema", { exact: true }).selectOption(demoIds.catalog(2));
  const description = page.getByLabel("¿Qué falla observaste?");
  await description.fill("No produce hielo desde esta mañana.");
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole("button", { name: "Crear ticket", exact: true }).click();
    await expect(
      page.getByText("El servicio no está disponible. Conservamos tus datos."),
    ).toBeVisible();
    await expect(description).toHaveValue("No produce hielo desde esta mañana.");
  }
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  await page.getByRole("link", { name: "Todos los tickets" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).not.toBeVisible();
  await context.setOffline(true);
  await expect(page.getByRole("button", { name: "Crear ticket", exact: true })).toBeDisabled();
  await context.setOffline(false);
});
for (const width of [375, 768, 1280, 1440]) {
  test.describe(`F7 tickets ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.beforeEach(async ({ page, context, baseURL }) => {
      await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
      await context.addCookies([
        {
          name: DEMO_COOKIE,
          value: encodeDemoState(defaultDemoState()),
          url: baseURL!,
          httpOnly: true,
        },
      ]);
    });
    test("reports a fault with confirmed photo and fits the viewport", async ({ page }) => {
      await page.goto("/maintenance/tickets/new");
      expect(await seriousViolations(page)).toEqual([]);
      const result = await reportTicketWithPhoto(page);
      expect(result.submitted?.evidenceIds).toEqual([result.fileId]);
      expect(result.submitted?.priority).toBe("high");
      expect(await seriousViolations(page)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
    test("list, chronology and read-only detail are accessible", async ({
      page,
      context,
      baseURL,
    }) => {
      await page.goto("/maintenance/tickets");
      await page.getByRole("link", { name: /TKT-000001/ }).click();
      await expect(page.getByRole("heading", { name: "Seguimiento cronológico" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Guardar diagnóstico" })).toBeEnabled();
      // Let the disabled-to-enabled color transition settle before measuring contrast.
      await page.waitForTimeout(300);
      expect(await seriousViolations(page)).toEqual([]);
      await context.addCookies([
        {
          name: DEMO_COOKIE,
          value: encodeDemoState({ ...defaultDemoState(), mode: "READ_ONLY" }),
          url: baseURL!,
          httpOnly: true,
        },
      ]);
      await page.reload();
      await expect(page.getByRole("button", { name: "Guardar diagnóstico" })).toBeDisabled();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  });
}
