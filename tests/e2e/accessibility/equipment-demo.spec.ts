import { expect, test, type Page } from "@playwright/test";
import {
  DEMO_COOKIE,
  defaultDemoState,
  encodeDemoState,
  type DemoState,
} from "../../../apps/private-web/src/server/demo/state";
import { DEMO_ACCOUNTS, DEMO_MODELS } from "../../../apps/private-web/src/server/demo/fixtures";
import { UI_QUALITY, UI_QUALITY_BASES } from "../../visual/review-page";
import { seriousViolations } from "./axe";

const machine = DEMO_ACCOUNTS.polar.machines[0]!;
const recordPath = `/machines?machineId=${machine.id}`;
async function persona(page: Page, values: Partial<DemoState> = {}) {
  await page.context().addCookies([
    {
      name: DEMO_COOKIE,
      value: encodeDemoState({ ...defaultDemoState(), ...values }),
      url: UI_QUALITY_BASES.web,
      httpOnly: true,
    },
  ]);
}
async function accessible(page: Page) {
  await expect(page.locator("h1")).toHaveCount(1);
  expect(await seriousViolations(page)).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
}

for (const width of [375, 1440])
  test.describe(`UXD-00B · datos y accesibilidad · ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.beforeEach(async ({ page }) => {
      await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
      await page.emulateMedia({ reducedMotion: "reduce" });
      await persona(page);
    });

    test("Dueño ve condición, componentes, frecuencias y calendario", async ({ page }) => {
      await page.goto(recordPath);
      await expect(page).toHaveTitle("Máquinas · ICE24 OS");
      const record = page.getByRole("article", { name: `Expediente ${machine.code}` });
      await expect(record).toBeFocused();
      await expect(record.locator(":scope > .data-list dd")).toHaveText([
        "Disponible",
        "Óptimo",
        "Al día",
        "Publicado",
      ]);
      for (const [tab, heading] of [
        ["Componentes", "Componentes de la máquina"],
        ["Frecuencias y alertas", "Frecuencias y alertas"],
        ["Calendario y trazabilidad", "Actividades y trazabilidad"],
      ]) {
        await record.getByRole("tab", { name: tab!, exact: true }).click();
        await expect(record.getByRole("heading", { name: heading!, exact: true })).toBeVisible();
        await expect(record.locator('[aria-busy="true"]')).toHaveCount(0);
        await expect(record).not.toContainText(/No disponible|Sin registros|undefined/);
        if (tab === "Componentes") await expect(record.locator(".config-card")).toHaveCount(3);
        if (tab === "Frecuencias y alertas") {
          await expect(record).toContainText("Sanitizar depósito de agua");
          await expect(record).toContainText("Revisar filtro de agua");
          await expect(record).toContainText("2 semanas");
        }
        if (tab === "Calendario y trazabilidad")
          await expect(record.locator(".config-schedule li")).toHaveCount(4);
        await accessible(page);
      }
      const tab = record.getByRole("tab", { name: "Componentes", exact: true });
      await tab.focus();
      await page.keyboard.press("ArrowRight");
      await expect(
        record.getByRole("tab", { name: "Frecuencias y alertas", exact: true }),
      ).toBeFocused();
      expect(
        await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle),
      ).not.toBe("none");
      for (const button of await record.getByRole("tab").all())
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      if (width === 1440) {
        await page.evaluate(() => {
          document.documentElement.style.zoom = "2";
        });
        await accessible(page);
      }
    });

    test("Resumen lee máquinas reales y conserva los estados auditados en SR-05", async ({
      page,
    }) => {
      await page.goto("/summary");
      const quickView = page.locator(".summary-screen__machines");
      await expect(quickView).toContainText(machine.code);
      await expect(quickView).toContainText(machine.name);
      await expect(quickView).toContainText("Disponible");
      await accessible(page);

      await persona(page, { maintenance: "empty" });
      await page.reload();
      await expect(page.getByText("No hay tareas por atender", { exact: true })).toBeVisible();
      await expect(page.locator(".summary-task-list li")).toHaveCount(0);
      await expect(quickView).toContainText(machine.name);

      await persona(page, { maintenance: "disabled" });
      await page.reload();
      await expect(page.getByText("Mantenimiento deshabilitado", { exact: true })).toBeVisible();
      await expect(page.getByText("No hay tareas por atender", { exact: true })).toHaveCount(0);
      await expect(quickView).toContainText(machine.name);

      await persona(page, { network: "error" });
      await page.reload();
      await expect(page.getByText("Sin datos", { exact: true }).first()).toBeVisible();
      await expect(quickView).not.toContainText(machine.name);
      await expect(page.getByText("No hay tareas por atender", { exact: true })).toHaveCount(0);
      await accessible(page);
    });

    test("Configuración presenta cuenta, usuarios, transferencias y frecuencias por modelo", async ({
      page,
    }) => {
      await page.goto("/account");
      await expect(page).toHaveTitle("Configuración de cuenta · ICE24 OS");
      await page.locator("summary").filter({ hasText: "Datos de cuenta" }).click();
      for (const label of [
        "Nombre o razón social",
        "Correo de contacto",
        "Teléfono",
        "RFC",
        "Domicilio fiscal",
      ])
        await expect(page.getByLabel(label)).not.toHaveValue("");
      await expect(
        page.getByRole("checkbox", { name: "Mantenimiento", exact: true }),
      ).toBeChecked();
      await accessible(page);
      await page.getByRole("button", { name: "Usuarios", exact: true }).click();
      await page.getByRole("button", { name: "Ver / editar" }).first().click();
      await expect(page.getByText(/^Usuario:/)).toContainText(/@demo\.invalid.*Roles:/);
      await expect(page.getByRole("main")).not.toContainText("undefined");
      await expect(page.getByRole("main")).toContainText("Operaciones ICE24");
      await expect(page.getByRole("main")).toContainText("Administración ICE24");
      await accessible(page);
      await page.getByRole("button", { name: "Transferencias", exact: true }).click();
      await expect(page.locator(".equipment-list li")).toHaveCount(2);
      await expect(page.locator(".equipment-list")).toContainText("Pendiente");
      await expect(page.locator(".equipment-list")).toContainText("Aprobado");
      await accessible(page);
      await page.getByRole("button", { name: "Componentes y frecuencias", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: /Prefiltro de sedimentos de 20 pulgadas/ }),
      ).toBeVisible();
      await page
        .getByRole("combobox", { name: "Modelo", exact: true })
        .selectOption(DEMO_MODELS[0].id);
      await expect(page.getByRole("heading", { name: /Revisar filtro de agua/ })).toBeVisible();
      await expect(page.getByRole("main")).not.toContainText(/No disponible|undefined/);
      await accessible(page);
      if (width === 1440) {
        await page.evaluate(() => {
          document.documentElement.style.zoom = "2";
        });
        await accessible(page);
      }
    });

    for (const role of ["technician", "readonly", "admin"] as const)
      test(`configuración de máquina respeta permisos de ${role}`, async ({ page }) => {
        await persona(page, { persona: role });
        await page.goto(recordPath);
        await page.getByRole("tab", { name: "Componentes", exact: true }).click();
        await expect(page.locator(".config-card")).toHaveCount(3);
        await expect(page.locator(".config-card summary")).toHaveCount(role === "admin" ? 3 : 0);
        await expect(
          page.locator("summary").filter({ hasText: "Crear componente propio" }),
        ).toHaveCount(0);
        await page.getByRole("tab", { name: "Frecuencias y alertas", exact: true }).click();
        await expect(page.getByRole("heading", { name: /Revisar filtro de agua/ })).toBeVisible();
        if (role !== "admin") await expect(page.locator(".config-card summary")).toHaveCount(0);
        await accessible(page);
        if (role !== "readonly") {
          await page.goto("/account");
          await expect(page.locator(".equipment-shell")).toHaveCount(0);
          await expect(page.getByRole("button", { name: "Invitar usuario" })).toHaveCount(0);
        }
      });

    test("modo lectura conserva datos sin controles de edición de componentes", async ({
      page,
    }) => {
      await persona(page, { mode: "READ_ONLY" });
      await page.goto(recordPath);
      await page.getByRole("tab", { name: "Componentes", exact: true }).click();
      await expect(page.locator(".config-card")).toHaveCount(3);
      await expect(page.locator(".config-card summary")).toHaveCount(0);
      await expect(
        page.getByText(/La cuenta está en modo lectura: puedes consultar/),
      ).toBeVisible();
      await accessible(page);
    });

    test("calendario separa carga, error con folio, vacío y desconexión", async ({ page }) => {
      let answer: "loading" | "error" | "empty" | "offline" = "loading";
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route("**/api/equipment?*", async (route) => {
        if (
          new URL(route.request().url()).searchParams.get("path") !==
          `machines/${machine.id}/schedules`
        )
          return route.continue();
        if (answer === "loading") await pending;
        if (answer === "offline") return route.abort("internetdisconnected");
        if (answer === "empty") return route.fulfill({ json: [] });
        return route.fulfill({
          status: 503,
          json: {
            message: "No fue posible cargar el calendario.",
            code: "DEPENDENCY_UNAVAILABLE",
            correlationId: "c0ffee00-0000-4000-8000-0000000003e7",
          },
        });
      });
      await page.goto(recordPath);
      await page.getByRole("tab", { name: "Calendario y trazabilidad", exact: true }).click();
      await expect(page.getByText("Cargando la información…")).toBeVisible();
      await expect(page.getByText(/Sin registros/)).toHaveCount(0);
      answer = "error";
      release();
      await expect(page.getByText("No fue posible cargar el calendario.")).toBeVisible();
      await expect(page.getByText("c0ffee00-0000-4000-8000-0000000003e7")).toBeVisible();
      await expect(page.getByText(/Sin registros/)).toHaveCount(0);
      await accessible(page);
      answer = "empty";
      await page.getByRole("button", { name: "Reintentar", exact: true }).click();
      await expect(page.getByText(/Sin registros/)).toBeVisible();
      await expect(page.getByText("No fue posible cargar el calendario.")).toHaveCount(0);
      answer = "offline";
      await page.getByRole("button", { name: "Calendario", exact: true }).click();
      await expect(page.getByText(/Sin conexión\. Necesitas red/)).toBeVisible();
      await expect(page.getByText(/Sin registros/)).toHaveCount(0);
      await accessible(page);
    });
  });
