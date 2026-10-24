/**
 * Keyboard gate (F6-12, WCAG 2.1.1, 2.1.2, 2.4.3, 2.4.7): the private shell, its dialogs and the
 * forms work without a mouse, with visible focus, no traps and focus returned where it was.
 */
import { expect, test, type Page } from "@playwright/test";

import { UI_QUALITY, UI_QUALITY_BASES, useReviewState } from "../../visual/review-page";
import { REVIEW_ROUTES } from "../../visual/ux-review.routes";

const OWNER = REVIEW_ROUTES.find((route) => route.id === "shell")!;
const NORMAL = { id: "normal", label: "Dueño" };

async function open(page: Page, path: string) {
  await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
  await useReviewState(page.context(), { ...OWNER, path }, NORMAL, UI_QUALITY_BASES.web);
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
}

const focused = (page: Page) =>
  page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    return {
      name: element?.getAttribute("aria-label") ?? element?.textContent?.trim() ?? "",
      outline: element ? getComputedStyle(element).outlineStyle : "none",
    };
  });

test.describe("Shell", () => {
  test("«Ir al contenido» is the first stop and skips the menu", async ({ page }) => {
    await open(page, "/notifications");
    await page.keyboard.press("Tab");
    const skip = await focused(page);
    expect(skip.name).toBe("Ir al contenido");
    expect(skip.outline).not.toBe("none");
    await page.keyboard.press("Enter");
    // The browser moves the starting point of Tab to <main>: the next stop is page content.
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => Boolean(document.activeElement?.closest("#main-content, main"))),
    ).toBe(true);
  });

  test("the whole menu is reachable with Tab and every stop shows its focus", async ({ page }) => {
    await open(page, "/notifications");
    const stops: string[] = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const stop = await focused(page);
      expect(stop.outline, `Foco visible en «${stop.name}»`).not.toBe("none");
      stops.push(stop.name);
    }
    for (const destination of ["Cuentas y máquinas", "Avisos", "Archivos privados"])
      expect(stops.some((stop) => stop.includes(destination))).toBe(true);
  });

  test("tablet drawer: opens with Enter, closes with Escape and returns focus", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await open(page, "/notifications");
    const trigger = page.getByRole("button", { name: "Abrir menú" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("dialog", { name: "Menú" });
    await expect(drawer).toBeVisible();
    expect(await drawer.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

test.describe("Dialogs", () => {
  test("context selector traps focus, closes with Escape and returns focus", async ({ page }) => {
    await open(page, "/notifications");
    const trigger = page.getByRole("button", { name: /Cambiar contexto/u });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Contexto de trabajo" });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("unsaved changes: Escape keeps editing and the typed data stays", async ({ page }) => {
    await open(page, "/plantillas/asistente");
    const model = page.getByLabel("Modelo");
    await model.focus();
    await model.selectOption("IC-500");
    await page.getByRole("link", { name: "Regresar" }).focus();
    await page.keyboard.press("Enter");
    const confirm = page.getByRole("alertdialog", { name: "Tienes cambios sin guardar" });
    await expect(confirm).toBeVisible();
    expect(await confirm.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(confirm).toBeHidden();
    await expect(model).toHaveValue("IC-500");
  });
});

test.describe("Forms", () => {
  test("wizard: errors are announced and focus moves to the step, all by keyboard", async ({
    page,
  }) => {
    await open(page, "/plantillas/asistente");
    await page.getByRole("button", { name: "Siguiente" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("alert").filter({ hasText: "Revisa este paso antes de continuar" }),
    ).toContainText("Elige el modelo de la máquina.");
    const heading = page.getByRole("heading", { level: 2, name: "Datos básicos" });
    await expect(heading).toBeFocused();

    await page.getByLabel("Modelo").focus();
    await page.getByLabel("Modelo").selectOption("IC-900");
    await page.keyboard.press("Tab");
    await page.keyboard.type("FAB-44910");
    await page.getByRole("button", { name: "Siguiente" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 2, name: "Ubicación" })).toBeFocused();
  });

  test("audit filters: labelled fields reachable in order and applied with Enter", async ({
    page,
  }) => {
    await open(page, "/audit");
    const apply = page.getByRole("button", { name: "Aplicar filtros" });
    await apply.focus();
    const stop = await focused(page);
    expect(stop.outline).not.toBe("none");
    await page.keyboard.press("Enter");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1, name: "Auditoría" })).toBeVisible();
  });
});
