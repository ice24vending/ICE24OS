/** Automated preparation only: never a human screen-reader sign-off (EXC-F6-01). */
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { WCAG_22_AA } from "./axe";
import { UI_QUALITY, UI_QUALITY_BASES, useReviewState } from "../../visual/review-page";
import { REVIEW_ROUTES } from "../../visual/ux-review.routes";
const shell = REVIEW_ROUTES.find((route) => route.id === "shell")!;
async function audit(page: Page, info: TestInfo, label: string) {
  const result = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
  await info.attach(label, {
    body: JSON.stringify({ violations: result.violations, incomplete: result.incomplete }),
    contentType: "application/json",
  });
  expect(result.violations, label).toEqual([]);
}
async function ready(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
}
for (const [index, width] of [375, 768, 1280].entries()) {
  test.describe(`${width}`, () => {
    test.use({ viewport: { width, height: 960 } });
    test(`SR-${String(index + 1).padStart(2, "0")} authentication: names, validation focus, alert and status`, async ({
      page,
      context,
    }, info) => {
      await context.clearCookies();
      await page.goto("/");
      await ready(page);
      const email = page.getByRole("textbox", { name: "Correo", exact: true });
      const password = page.getByLabel("Contraseña", { exact: true });
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Ir al contenido" })).toBeFocused();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Tab");
      await expect(email).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(password).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Continuar", exact: true })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(email).toBeFocused();
      await email.fill("qa@example.invalid");
      await page.getByRole("button", { name: "Continuar", exact: true }).click();
      await expect(password).toBeFocused();
      await audit(page, info, "authentication-invalid-fields");
      await page.goto("/?error=access");
      await expect(page.locator("main").getByRole("alert")).toContainText(
        "No fue posible iniciar sesión",
      );
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Ir al contenido" })).toBeFocused();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Tab");
      await expect(email).toBeFocused();
      await audit(page, info, "authentication-server-error");
      await page.goto("/?recovery=sent");
      await expect(page.getByRole("status")).toContainText("Si la cuenta existe");
      await useReviewState(context, shell, { id: "normal", label: "Owner" }, UI_QUALITY_BASES.web);
      await page.goto("/summary");
      await expect(page.getByRole("heading", { name: "Resumen", exact: true })).toBeVisible();
    });
    test(`SR-${String(index + 4).padStart(2, "0")} context: dialog focus, labels, error and successful switch`, async ({
      page,
      context,
    }, info) => {
      await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
      await useReviewState(context, shell, { id: "normal", label: "Owner" }, UI_QUALITY_BASES.web);
      await page.goto("/summary");
      await ready(page);
      const trigger = page.getByRole("button", { name: /Cambiar contexto/u });
      await trigger.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: "Contexto de trabajo" });
      await expect(dialog).toBeVisible();
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      for (const key of ["Tab", "Shift+Tab"])
        for (let stop = 0; stop < 18; stop++) {
          await page.keyboard.press(key);
          expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
        }
      await audit(page, info, "context-dialog");
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await page.keyboard.press("Enter");
      const branch = dialog.getByRole("combobox", { name: "Sucursal", exact: true });
      const machine = dialog.getByRole("combobox", { name: "Máquina", exact: true });
      await branch.selectOption({ index: 1 });
      await machine.selectOption({ index: 1 });
      const apply = dialog.getByRole("button", { name: "Aplicar sucursal y máquina" });
      await branch.focus();
      await page.keyboard.press("Tab");
      await expect(machine).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(apply).toBeFocused();
      await page.route("**/api/session-context/focus", (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "No pudimos cambiar el contexto." }),
        }),
      );
      await apply.focus();
      await page.keyboard.press("Enter");
      await expect(dialog.getByRole("alert")).toContainText("No se cambió el contexto");
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      await audit(page, info, "context-error");
      await page.unroute("**/api/session-context/focus");
      await apply.click();
      await expect(dialog).toBeHidden();
      await ready(page);
      await expect(trigger).not.toContainText("MáquinaTodas");
      await audit(page, info, "context-applied");
    });
    test(`SR-${String(index + 7).padStart(2, "0")} empty summary: headings, distinct states and skip focus`, async ({
      page,
      context,
    }, info) => {
      await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
      await useReviewState(
        context,
        shell,
        { id: "empty", label: "Empty", demo: { scenario: "empty", maintenance: "empty" } },
        UI_QUALITY_BASES.web,
      );
      await page.goto("/plantillas/panel");
      await ready(page);
      await expect(page.getByText("Sin datos disponibles todavía.", { exact: true })).toBeVisible();
      await audit(page, info, "f6-dashboard-empty");
      await page.goto("/summary");
      await ready(page);
      await expect(page.getByRole("heading", { name: "Resumen", exact: true })).toBeVisible();
      await expect(page.getByText("No hay tareas por atender", { exact: true })).toBeVisible();
      await expect(page.locator(".summary-task-list li")).toHaveCount(0);
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Ir al contenido" })).toBeFocused();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest("main")))).toBe(
        true,
      );
      await audit(page, info, "summary-empty");
      await useReviewState(
        context,
        shell,
        { id: "disabled", label: "Disabled", demo: { maintenance: "disabled" } },
        UI_QUALITY_BASES.web,
      );
      await page.reload();
      await expect(page.getByText("Mantenimiento deshabilitado", { exact: true })).toBeVisible();
      await expect(page.getByText("No hay tareas por atender", { exact: true })).toHaveCount(0);
      await audit(page, info, "summary-disabled");
      await useReviewState(context, shell, { id: "normal", label: "Normal" }, UI_QUALITY_BASES.web);
      await page.goto("/plantillas/panel");
      await ready(page);
      // A polite live region must exist before its content changes; insertion alone is unreliable.
      await expect(page.locator("main").getByRole("status")).toHaveCount(1);
      await page.getByRole("button", { name: "Marcar enterado", exact: true }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "Alerta marcada como enterada" }),
      ).toBeVisible();
      await audit(page, info, "f6-status-after-action");
    });
    test(`SR-${String(index + 10).padStart(2, "0")} role navigation: six personas, menu, route focus and forbidden action`, async ({
      page,
      context,
    }, info) => {
      test.setTimeout(120000);
      await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
      for (const persona of [
        "owner",
        "admin",
        "technician",
        "readonly",
        "ice24",
        "platform",
      ] as const) {
        await useReviewState(
          context,
          shell,
          { id: persona, label: persona, demo: { persona } },
          UI_QUALITY_BASES.web,
        );
        await page.goto("/summary");
        await ready(page);
        await page.keyboard.press("Tab");
        await expect(page.getByRole("link", { name: "Ir al contenido" })).toBeFocused();
        if (width < 1280) {
          const menu = page.getByRole("button", { name: "Abrir menú" });
          await menu.focus();
          await page.keyboard.press("Enter");
          const dialog = page.getByRole("dialog", { name: "Menú", exact: true });
          await expect(dialog).toBeVisible();
          expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
          await audit(page, info, `menu-${persona}`);
          await page.keyboard.press("Escape");
          await expect(menu).toBeFocused();
        }
        if (width < 1280) await page.getByRole("button", { name: "Abrir menú" }).click();
        const navigation =
          width < 1280 ? page.getByRole("dialog", { name: "Menú", exact: true }) : page;
        const machines = navigation
          .getByRole("link", { name: "Máquinas", exact: true })
          .filter({ visible: true })
          .first();
        await machines.focus();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/machines$/);
        // NavItem uses a full document navigation: verify its reset starts at the skip link.
        // Client transitions are separately covered by the existing shell keyboard tests.
        await ready(page);
        await page.keyboard.press("Tab");
        await expect(page.getByRole("link", { name: "Ir al contenido" })).toBeFocused();
        await page.keyboard.press("Enter");
        await page.keyboard.press("Tab");
        expect(await page.evaluate(() => Boolean(document.activeElement?.closest("main")))).toBe(
          true,
        );
        await audit(page, info, `navigation-${persona}`);
        if (["owner", "admin"].includes(persona)) {
          await page.goto("/ice24");
          await expect(page.locator('[data-state="forbidden"]')).toBeVisible();
          await expect(page.getByText("Volver a intentar", { exact: true })).toHaveCount(0);
          await audit(page, info, `forbidden-${persona}`);
        } else {
          await page.goto("/maintenance/work-orders/new");
          await expect(page.locator('[data-state="forbidden"]')).toBeVisible();
          await expect(page.getByText("Volver a intentar", { exact: true })).toHaveCount(0);
          await expect(page.getByRole("link", { name: "Volver a órdenes" })).toHaveAttribute(
            "href",
            "/maintenance/work-orders",
          );
          await audit(page, info, `forbidden-${persona}`);
        }
      }
    });
  });
}
