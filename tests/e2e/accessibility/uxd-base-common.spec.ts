import { expect, test, type Page } from "@playwright/test";

import {
  DEMO_PERSONAS,
  ROLE_PERMISSIONS,
} from "../../../apps/private-web/src/server/demo/personas";
import { UI_QUALITY, UI_QUALITY_BASES, useReviewState } from "../../visual/review-page";
import { REVIEW_ROUTES, type ReviewState } from "../../visual/ux-review.routes";
import { seriousViolations } from "./axe";

const list = REVIEW_ROUTES.find((route) => route.id === "base-comun-lista")!;
const normal = { id: "normal", label: "Dueño" };
const firstId = "c0000000-0000-4000-8000-000000000001";
const linkId = `fila-${firstId}`;
const storageKey = "ice24.view.plantillas/lista";
const REFLOW_CASES = [
  { width: 375, zoom: 1, label: "móvil de 375 px" },
  { width: 1280, zoom: 2, label: "1280 px con ampliación CSS al 200%" },
  // Browser zoom at 200% halves the CSS viewport: exercise its responsive breakpoints too.
  { width: 640, zoom: 1, label: "viewport efectivo de 640 px (1280 / 2)" },
] as const;

async function open(page: Page, path = list.path, state: ReviewState = normal) {
  await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
  await useReviewState(page.context(), list, state, UI_QUALITY_BASES.web);
  await page.goto(path);
  await expect(page.locator("#main-content h1")).toBeVisible();
  if (path.startsWith("/plantillas/"))
    await expect(page.locator("#main-content")).toHaveAttribute("data-page-ready", "true");
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
  await page.waitForFunction(
    () => !document.querySelector(".ids-list-layout__filters-toggle:disabled"),
  );
}

async function rememberFocus(page: Page) {
  await page.evaluate(() => {
    const targets: string[] = [];
    (window as unknown as { uxdFocus: string[] }).uxdFocus = targets;
    document.addEventListener("focusin", (event) => {
      if (event.target instanceof HTMLElement)
        targets.push(event.target.id || event.target.tagName);
    });
  });
}

const recordedFocus = (page: Page) =>
  page.evaluate(() => (window as unknown as { uxdFocus: string[] }).uxdFocus);

async function rememberRouteAnnouncements(page: Page) {
  const announcer = page.locator("next-route-announcer").locator('[role="alert"]');
  await expect(announcer).toHaveCount(1);
  await announcer.evaluate((element) => {
    const messages: string[] = [];
    (window as unknown as { uxdRouteAnnouncements: string[] }).uxdRouteAnnouncements = messages;
    new MutationObserver(() => {
      const message = element.textContent?.trim();
      if (message) messages.push(message);
    }).observe(element, { subtree: true, childList: true, characterData: true });
  });
}

const routeAnnouncements = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { uxdRouteAnnouncements: string[] }).uxdRouteAnnouncements,
  );

test.describe("UXD-00 · Base común", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("fila con enlace real, ordenamiento accesible y clic en otra celda", async ({ page }) => {
    await open(page);
    const link = page.locator(`#${linkId}`);
    await expect(link).toHaveAttribute(
      "href",
      new RegExp(`/plantillas/detalle/${firstId}\\?desde=`),
    );
    const row = link.locator("xpath=ancestor::tr");
    await expect(row).not.toHaveAttribute("tabindex");
    await expect(row).not.toHaveAttribute("role");
    const code = page.getByRole("columnheader", { name: "Código", exact: true });
    await code.getByRole("button").click();
    await expect(code).toHaveAttribute("aria-sort", "ascending");
    await code.getByRole("button").click();
    await expect(code).toHaveAttribute("aria-sort", "descending");
    await row.getByRole("cell", { name: "Despachadora Juárez", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/plantillas/detalle/${firstId}`));
    await expect(page).toHaveTitle("Detalle · ICE24 OS");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Despachadora Juárez");
  });

  test("volver conserva filtros y devuelve el foco una sola vez a la fila", async ({ page }) => {
    await open(page, `${list.path}&q=MTY&ubicacion=Centro+Monterrey&vista=bloques`);
    await page.locator(`#${linkId}`).click();
    await expect(page).toHaveURL(new RegExp(`/plantillas/detalle/${firstId}`));
    await expect(page.locator("#main-content")).toHaveAttribute("data-page-ready", "true");
    await expect(page.locator("#main-content")).toHaveAttribute("data-page-breadcrumbs", "true");
    await expect(page.locator(".shell-breadcrumbs")).toBeHidden();
    const back = page.getByRole("link", { name: "Volver a máquinas", exact: true });
    await expect(back).toHaveAttribute("href", /volverA=fila-/);
    await back.focus();
    await rememberFocus(page);
    await rememberRouteAnnouncements(page);
    await page.keyboard.press("Enter");
    await expect(page.locator(`#${linkId}`)).toBeFocused();
    await expect(page.locator(".shell-breadcrumbs")).toBeVisible();
    const query = new URL(page.url()).searchParams;
    expect(query.get("q")).toBe("MTY");
    expect(query.get("ubicacion")).toBe("Centro Monterrey");
    expect(query.get("vista")).toBe("bloques");
    expect(query.has("volverA")).toBe(false);
    expect((await recordedFocus(page)).filter((id) => id === linkId)).toHaveLength(1);
    expect(await recordedFocus(page)).not.toContain("main-content");
    await expect(page.locator("next-route-announcer")).toHaveCount(1);
    await expect(page).toHaveTitle("Máquinas · ICE24 OS");
    await expect
      .poll(() => routeAnnouncements(page))
      .toEqual([expect.stringMatching(/^Máquinas(?: · ICE24 OS)?$/u)]);
  });

  test("volver a una fila que ya no está enfoca el título de la lista", async ({ page }) => {
    const origin = `${list.path}&q=no-hay-coincidencias`;
    await open(page, `/plantillas/detalle/${firstId}?desde=${encodeURIComponent(origin)}`);
    await page.getByRole("link", { name: "Volver a máquinas", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Máquinas" })).toBeFocused();
    expect(new URL(page.url()).searchParams.get("q")).toBe("no-hay-coincidencias");
    expect(new URL(page.url()).searchParams.has("volverA")).toBe(false);
  });

  test("la navegación ordinaria enfoca el contenido y conserva el anunciador de Next", async ({
    page,
  }) => {
    await open(page, "/plantillas/detalle?ejemplo=base");
    await rememberRouteAnnouncements(page);
    await page.getByRole("link", { name: "Probar lista y detalle", exact: true }).click();
    await expect(page.locator("#main-content")).toBeFocused();
    await expect(page).toHaveTitle("Máquinas · ICE24 OS");
    await expect(page.locator("next-route-announcer")).toHaveCount(1);
    await expect
      .poll(() => routeAnnouncements(page))
      .toEqual([expect.stringMatching(/^Máquinas(?: · ICE24 OS)?$/u)]);
    expect(new URL(page.url()).searchParams.has("volverA")).toBe(false);
  });

  test("la página puede declarar sus propias migas sin cambiar la ruta ni el shell", async ({
    page,
  }) => {
    await open(page);
    const crumbs = page.locator(".shell-breadcrumbs");
    await expect(crumbs).toBeVisible();
    await page.locator("#main-content").evaluate((main) => {
      main.setAttribute("data-page-breadcrumbs", "true");
    });
    await expect(crumbs).toBeHidden();
    await page.locator("#main-content").evaluate((main) => {
      main.removeAttribute("data-page-breadcrumbs");
    });
    await expect(crumbs).toBeVisible();
    await expect(page).toHaveURL(new RegExp("/plantillas/lista\\?ejemplo=base$"));
  });

  test("flechas cambian la vista con un anuncio por elección y conservan el foco", async ({
    page,
  }) => {
    await open(page);
    const group = page.getByRole("radiogroup", { name: "Vista de los registros" });
    const announcement = page.getByRole("status", { name: "Cambio de vista" });
    await expect(announcement).toHaveText("");
    await announcement.evaluate((element) => {
      const changes: string[] = [];
      (window as unknown as { uxdAnnouncements: string[] }).uxdAnnouncements = changes;
      new MutationObserver(() => changes.push(element.textContent ?? "")).observe(element, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    });
    await group.getByRole("radio", { name: "Lista", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(group.getByRole("radio", { name: "Bloques", exact: true })).toBeChecked();
    await expect(group.getByRole("radio", { name: "Bloques", exact: true })).toBeFocused();
    await expect(announcement).toHaveText("Vista de bloques.");
    await expect(page).toHaveURL(/vista=bloques/);
    await page.getByRole("radio", { name: "Bloques", exact: true }).click();
    expect(
      await page.evaluate(
        () => (window as unknown as { uxdAnnouncements: string[] }).uxdAnnouncements,
      ),
    ).toEqual(["Vista de bloques."]);
    await page.keyboard.press("ArrowLeft");
    await expect(announcement).toHaveText("Vista de lista.");
    expect(
      await page.evaluate(
        () => (window as unknown as { uxdAnnouncements: string[] }).uxdAnnouncements,
      ),
    ).toEqual(["Vista de bloques.", "Vista de lista."]);
  });

  test("la URL prevalece sobre la preferencia guardada y restaurarla no se anuncia", async ({
    page,
  }) => {
    await open(page, `${list.path}&q=MTY`);
    await page.getByRole("radio", { name: "Bloques", exact: true }).check();
    await expect(page).toHaveURL(/vista=bloques/);
    expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe("bloques");
    await page.goto(`${list.path}&q=MTY`);
    await expect(page.getByRole("radio", { name: "Bloques", exact: true })).toBeChecked();
    await expect(page).toHaveURL(/vista=bloques/);
    await expect(page.getByRole("status", { name: "Cambio de vista" })).toHaveText("");
    await page.goto(`${list.path}&vista=lista&q=MTY`);
    await expect(page.getByRole("radio", { name: "Lista", exact: true })).toBeChecked();
    await expect(page.getByRole("status", { name: "Cambio de vista" })).toHaveText("");
    expect(new URL(page.url()).searchParams.get("q")).toBe("MTY");
  });

  test("el alternador funciona si el navegador bloquea localStorage", async ({ page }) => {
    await page.addInitScript((key) => {
      const get = Storage.prototype.getItem;
      const set = Storage.prototype.setItem;
      Storage.prototype.getItem = function (name: string) {
        if (name === key) throw new DOMException("Storage blocked", "SecurityError");
        return get.call(this, name);
      };
      Storage.prototype.setItem = function (name: string, value: string) {
        if (name === key) throw new DOMException("Storage full", "QuotaExceededError");
        set.call(this, name, value);
      };
    }, storageKey);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await open(page);
    await page.getByRole("radio", { name: "Bloques", exact: true }).check();
    await expect(page).toHaveURL(/vista=bloques/);
    await expect(page.getByRole("radio", { name: "Bloques", exact: true })).toBeChecked();
    expect(errors).toEqual([]);
  });

  for (const persona of ["owner", "technician", "readonly", "admin"] as const)
    test(`${DEMO_PERSONAS[persona].label}: ejemplos sin acciones no autorizadas`, async ({
      page,
    }) => {
      await open(page, list.path, { id: persona, label: persona, demo: { persona } });
      const permissions = ROLE_PERMISSIONS[DEMO_PERSONAS[persona].role];
      const menu = page.locator(".shell-sidebar");
      await expect(menu.getByRole("link", { name: "Suscripción", exact: true })).toHaveCount(
        permissions.includes("subscriptions.read") ? 1 : 0,
      );
      await expect(menu.getByRole("link", { name: "Auditoría", exact: true })).toHaveCount(
        permissions.includes("audit.read") ? 1 : 0,
      );
      await expect(page.getByRole("link", { name: "Solicitar alta", exact: true })).toHaveCount(0);
      await page.locator("a[data-row-link]").first().click();
      await expect(
        page.getByRole("button", { name: "Registrar lectura", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "Volver a máquinas", exact: true }),
      ).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });

  for (const view of ["lista", "bloques"])
    for (const { width, zoom, label } of REFLOW_CASES)
      test(`${view} · ${label}: sin desplazamiento lateral y controles de 44 px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 812 });
        await open(page, `${list.path}&vista=${view}`);
        await page.addStyleTag({ content: `html { zoom: ${zoom}; }` });
        const layout = await page.locator("#main-content").evaluate((main) => {
          const root = document.documentElement;
          const targets = Array.from(
            main.querySelectorAll<HTMLElement>(".ids-view-switcher label, a[data-row-link]"),
          );
          return {
            client: root.clientWidth,
            scroll: root.scrollWidth,
            targets: targets.map((element) => ({
              width: element.getBoundingClientRect().width,
              height: element.getBoundingClientRect().height,
            })),
          };
        });
        expect(layout.scroll).toBeLessThanOrEqual(layout.client + 1);
        expect(layout.targets.length).toBeGreaterThan(2);
        for (const size of layout.targets) {
          expect(size.width).toBeGreaterThanOrEqual(44);
          expect(size.height).toBeGreaterThanOrEqual(44);
        }
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        await expect(page.getByRole("main")).toHaveAccessibleName("Máquinas");
        await expect(page).toHaveTitle("Máquinas · ICE24 OS");
        expect(await seriousViolations(page)).toEqual([]);
      });

  test("los cuatro módulos comparten margen con Resumen y Suscripción conserva un ancho legible", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "/summary");
    const summary = await page.locator("#main-content").boundingBox();
    expect(summary).not.toBeNull();
    for (const path of ["/notifications", "/audit", "/files", "/subscription"]) {
      await page.goto(path);
      await expect(page.locator("#main-content h1")).toBeVisible();
      const bounds = await page.locator(".account-page").boundingBox();
      expect(bounds, path).not.toBeNull();
      expect(Math.abs(bounds!.x - summary!.x), path).toBeLessThanOrEqual(1);
      if (path === "/subscription") expect(bounds!.width).toBeLessThanOrEqual(960);
      else expect(Math.abs(bounds!.width - summary!.width), path).toBeLessThanOrEqual(1);
    }
  });

  for (const path of ["/notifications", "/audit", "/files", "/subscription"])
    test(`${path}: reflujo en móvil y al ampliar a 200%`, async ({ page }) => {
      for (const { width, zoom, label } of REFLOW_CASES) {
        await page.setViewportSize({ width, height: 900 });
        await open(page, path);
        await page.addStyleTag({ content: `html { zoom: ${zoom}; }` });
        const bounds = await page.evaluate(() => ({
          visible: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        }));
        expect(bounds.content, `${path} · ${label}`).toBeLessThanOrEqual(bounds.visible + 1);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        expect(await seriousViolations(page)).toEqual([]);
      }
    });
});
