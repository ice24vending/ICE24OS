import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  DEMO_COOKIE,
  defaultDemoState,
  encodeDemoState,
  type DemoState,
} from "../../../apps/private-web/src/server/demo/state";
import { UI_QUALITY, UI_QUALITY_BASES } from "../../visual/review-page";
import { seriousViolations } from "./axe";

async function open(page: Page, context: BrowserContext, overrides: Partial<DemoState> = {}) {
  await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
  await context.addCookies([
    {
      name: DEMO_COOKIE,
      value: encodeDemoState({ ...defaultDemoState(), ...overrides }),
      url: UI_QUALITY_BASES.web,
      httpOnly: true,
    },
  ]);
  await page.goto("/profile");
  await expect(page.locator("main#main-content")).toHaveAttribute("data-page-ready", "true");
}
for (const width of [375, 1280])
  test.describe(`Perfil UXD-11 ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const persona of ["owner", "technician", "readonly", "admin"] as const)
      test(`${persona}: accesibilidad, permisos y alcance`, async ({ page, context }) => {
        await open(page, context, { persona });
        await expect(page).toHaveTitle("Perfil · ICE24 OS");
        await expect(page.locator("main")).toHaveCount(1);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Perfil");
        await expect(page.getByRole("button", { name: "Editar", exact: true })).toBeVisible();
        await expect(
          page
            .getByRole("region", { name: "Tus sesiones" })
            .getByText("Esta sesión", { exact: true }),
        ).toBeVisible();
        await page.locator(".profile-permissions summary").click();
        if (persona !== "owner")
          await expect(
            page.getByText("Administrar integrantes de la cuenta", { exact: true }),
          ).toHaveCount(0);
        if (persona === "admin")
          await expect(page.getByRole("region", { name: "Rol y alcance" })).toContainText(
            "Centro Monterrey",
          );
        if (persona === "technician")
          await expect(page.getByRole("region", { name: "Rol y alcance" })).not.toContainText(
            "Toda la cuenta",
          );
        expect(await seriousViolations(page)).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (width === 375) {
          const targets = await page
            .locator("main button:visible, main a.ids-button:visible, main summary:visible")
            .evaluateAll((elements) =>
              elements.map((e) => ({
                text: e.textContent,
                height: e.getBoundingClientRect().height,
                width: e.getBoundingClientRect().width,
              })),
            );
          expect(targets.filter((t) => t.height < 44 || t.width < 44)).toEqual([]);
        }
      });
    test("edita y conserva el perfil; confirma y cancela cierres", async ({ page, context }) => {
      await open(page, context);
      await page.getByRole("button", { name: "Editar", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Editar perfil" });
      await expect(dialog.getByRole("textbox", { name: /Nombre/ })).toBeFocused();
      await dialog.getByRole("textbox", { name: /Nombre/ }).fill("Laura Méndez Ruiz");
      await dialog.getByRole("textbox", { name: "Puesto", exact: true }).fill("Directora regional");
      expect(await seriousViolations(page)).toEqual([]);
      await dialog.getByRole("button", { name: "Guardar cambios" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole("region", { name: "Datos de perfil" })).toContainText(
        "Directora regional",
      );
      await page.reload();
      await expect(page.getByRole("region", { name: "Datos de perfil" })).toContainText(
        "Laura Méndez Ruiz",
      );
      await expect(
        page.getByRole("region", { name: "Mi actividad reciente" }).locator("li").first(),
      ).toContainText("Actualizaste tus datos de perfil");
      await page.getByRole("button", { name: "Cerrar las demás sesiones", exact: true }).click();
      const confirmation = page.getByRole("alertdialog");
      await expect(confirmation).toContainText("Esta sesión permanecerá activa");
      expect(await seriousViolations(page)).toEqual([]);
      await confirmation.getByRole("button", { name: "Cancelar" }).click();
      await expect(
        page.getByRole("button", { name: "Cerrar las demás sesiones", exact: true }),
      ).toBeFocused();
      await page.getByRole("button", { name: /Cerrar esta sesión\s*: Safari/ }).click();
      await expect(confirmation).toContainText("Safari");
      await confirmation.getByRole("button", { name: "Cancelar" }).click();
      await page.getByRole("button", { name: "Cerrar las demás sesiones", exact: true }).click();
      await confirmation.getByRole("button", { name: "Confirmar cierre" }).click();
      await expect(confirmation).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Cerrar las demás sesiones", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /Cerrar esta sesión\s*: Chrome/ }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.getByRole("button", { name: /Cerrar esta sesión\s*: Chrome/ }).click();
      await expect(confirmation).toContainText("Tendrás que volver a iniciar sesión");
      await confirmation.getByRole("button", { name: "Confirmar cierre" }).click();
      await expect(page).toHaveURL(`${UI_QUALITY_BASES.web}/`);
    });
  });
test("Perfil UXD-11: reflujo al 200 % y bloqueo sin conexión", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, context);
  // Browser zoom at 200% halves the CSS viewport and activates responsive breakpoints.
  // CSS `zoom` would scale the shell without updating those media queries.
  await page.setViewportSize({ width: 640, height: 450 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
  await context.setOffline(true);
  await expect(page.getByRole("button", { name: "Editar", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Cerrar las demás sesiones", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  await context.setOffline(false);
});
