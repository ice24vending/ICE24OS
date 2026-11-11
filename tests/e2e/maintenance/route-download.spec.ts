import { expect, test } from "@playwright/test";
import { useReviewState, UI_QUALITY, UI_QUALITY_BASES } from "../../visual/review-page";
import { seriousViolations } from "../accessibility/axe";
import { demoIds } from "../../../apps/private-web/src/server/demo/fixtures";
for (const width of [375, 1280]) {
  test(`route preview and partial download at ${width}px preserve other orders`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
    await useReviewState(
      context,
      { id: "route", title: "Ruta", path: "/maintenance/work-orders", review: "Ruta", states: [] },
      { id: "technician", label: "Técnico", demo: { persona: "technician" } },
      UI_QUALITY_BASES.web,
    );
    let downloads = 0;
    await page.route("**/api/synchronization/orders/*/download", async (route) => {
      downloads++;
      if (downloads === 1)
        return route.fulfill({
          status: 409,
          json: { message: "Orden reservada en otro dispositivo." },
        });
      return route.continue();
    });
    await page.goto("/maintenance/work-orders?view=assigned");
    await page.getByRole("button", { name: "Ver mi ruta", exact: true }).click();
    const confirm = page.getByRole("button", { name: /Descargar mi ruta · \d+ órdenes/ });
    await expect(confirm).toBeVisible();
    await expect(page.getByText("Cabe todo", { exact: true })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Inicio y reserva" })).toContainText(
      "Estas órdenes pasarán a En atención",
    );
    const preview = page.getByRole("region", { name: "Descargar mi ruta" });
    await expect(preview).toContainText(/descarga estimada: [\d.,]+ MB · disponibles: [\d.,]+ MB/);
    for (const row of await preview.getByRole("listitem").all()) {
      await expect(row).toContainText(/Atrasada|Vence hoy|En atención/);
      await expect(row).toContainText("Fecha límite:");
    }
    expect(downloads).toBe(0);
    await confirm.click();
    await expect(page.getByText(/Ruta procesada:/)).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("Orden reservada en otro dispositivo.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir", exact: true }).first()).toBeVisible();
    expect(downloads).toBeGreaterThan(1);
    expect(await seriousViolations(page)).toEqual([]);
    await context.setOffline(true);
    await expect(page.getByText("Tus órdenes descargadas siguen disponibles.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Órdenes descargadas" })).toBeVisible();
  });
}
test("does not reserve orders excluded by the preview", async ({ page, context }) => {
  await useReviewState(
    context,
    { id: "route", title: "Ruta", path: "/maintenance/work-orders", review: "Ruta", states: [] },
    { id: "technician", label: "Técnico", demo: { persona: "technician" } },
    UI_QUALITY_BASES.web,
  );
  let excludedId = "",
    excludedFolio = "",
    total = 0;
  const requested: string[] = [];
  await page.route("**/api/synchronization/route-plan*", async (route) => {
    const response = await route.fetch();
    const plan = await response.json();
    excludedId = plan.items[0].order.id;
    excludedFolio = plan.items[0].order.folio;
    total = plan.items.length;
    plan.items[0].estimatedBytes = 51 * 1024 * 1024;
    await route.fulfill({ json: plan });
  });
  await page.route("**/api/synchronization/orders/*/download", async (route) => {
    requested.push(route.request().url().split("/").at(-2)!);
    await route.fulfill({ status: 409, json: { message: "Orden reservada en otro dispositivo." } });
  });
  await page.goto("/maintenance/work-orders?view=assigned");
  await page.getByRole("button", { name: "Ver mi ruta", exact: true }).click();
  await expect(page.getByText(/No caben 1:/)).toBeVisible();
  await expect(page.getByText(/No caben 1:/)).toContainText(excludedFolio);
  expect(requested).toHaveLength(0);
  await page
    .getByRole("button", { name: `Descargar mi ruta · ${total - 1} órdenes`, exact: true })
    .click();
  await expect(page.getByText(/Ruta procesada:/)).toBeVisible();
  expect(requested).toHaveLength(total - 1);
  expect(requested).not.toContain(excludedId);
});
test("excludes an actual reservation on another device from count, space and download requests", async ({
  page,
  context,
}) => {
  await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
  await useReviewState(
    context,
    { id: "route", title: "Ruta", path: "/maintenance/work-orders", review: "Ruta", states: [] },
    { id: "technician", label: "Técnico", demo: { persona: "technician" } },
    UI_QUALITY_BASES.web,
  );
  const reservedId = demoIds.job(2003);
  await page.goto(`/maintenance/work-orders/${reservedId}/execute`);
  await page.getByRole("button", { name: "Descargar para trabajar sin conexión" }).click();
  await expect(page.getByRole("link", { name: "Abrir orden descargada" })).toBeVisible();
  // A second physical device has another device identifier. Keep the old local copy to
  // prove that a foreign lease takes precedence over stale browser evidence.
  await page.evaluate(() => localStorage.setItem("ice24-offline-device", crypto.randomUUID()));
  const requests: string[] = [];
  await page.route("**/api/synchronization/orders/*/download", async (route) => {
    requests.push(route.request().url().split("/").at(-2)!);
    await route.fulfill({ status: 409, json: { message: "Reserva de prueba" } });
  });
  await page.goto("/maintenance/work-orders?view=assigned");
  const responsePromise = page.waitForResponse((r) =>
    r.url().includes("/api/synchronization/route-plan?"),
  );
  await page.getByRole("button", { name: "Ver mi ruta", exact: true }).click();
  const plan = await (await responsePromise).json();
  expect(
    plan.items.find((i: { order: { id: string } }) => i.order.id === reservedId).reservedElsewhere,
  ).toBe(true);
  const eligible = plan.items.filter((i: { reservedElsewhere: boolean }) => !i.reservedElsewhere);
  const bytes = eligible.reduce(
    (sum: number, i: { estimatedBytes: number }) => sum + i.estimatedBytes,
    0,
  );
  const mb = (Math.ceil((bytes / 1024 / 1024) * 1000) / 1000).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
  const panel = page.getByRole("region", { name: "Descargar mi ruta" });
  await expect(panel.getByText("Reservada en otro dispositivo", { exact: true })).toBeVisible();
  await expect(panel).toContainText(`descarga estimada: ${mb} MB`);
  const button = panel.getByRole("button", {
    name: `Descargar mi ruta · ${eligible.length} órdenes`,
    exact: true,
  });
  await expect(button).toBeVisible();
  expect(requests).toEqual([]);
  await button.click();
  await expect(page.getByText(/Ruta procesada:/)).toBeVisible();
  expect(requests).toHaveLength(eligible.length);
  expect(requests).not.toContain(reservedId);
});
test("explains why read-only accounts cannot reserve a route", async ({ page, context }) => {
  await useReviewState(
    context,
    { id: "route", title: "Ruta", path: "/maintenance/work-orders", review: "Ruta", states: [] },
    { id: "readonly", label: "Lectura", demo: { persona: "technician", mode: "READ_ONLY" } },
    UI_QUALITY_BASES.web,
  );
  await page.goto("/maintenance/work-orders?view=assigned");
  const panel = page.getByRole("region", { name: "Descargar mi ruta" });
  await expect(panel.getByRole("button", { name: "Ver mi ruta", exact: true })).toBeDisabled();
  await expect(panel.getByText(/Modo lectura: no puedes iniciar/)).toBeVisible();
});

for (const width of [375, 1280]) {
  test(`download route survives offline list and editor reloads at ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
    await useReviewState(
      context,
      { id: "route", title: "Ruta", path: "/maintenance/work-orders", review: "Ruta", states: [] },
      { id: "technician", label: "Técnico", demo: { persona: "technician" } },
      UI_QUALITY_BASES.web,
    );
    await page.goto("/maintenance/work-orders?view=assigned");
    const nav = page.getByRole("navigation", { name: "Mantenimiento" });
    const sync = page.getByRole("link", { name: "Centro de sincronización", exact: true });
    const tabsBox = await nav.boundingBox(),
      syncBox = await sync.boundingBox();
    expect(tabsBox).not.toBeNull();
    expect(syncBox).not.toBeNull();
    expect(syncBox!.y - tabsBox!.y - tabsBox!.height).toBeGreaterThanOrEqual(16);
    await page.getByRole("button", { name: "Ver mi ruta", exact: true }).click();
    const notice =
      "Si cierras el navegador, necesitarás conexión para volver a abrir tus descargas.";
    await expect(page.getByText(notice, { exact: true })).toBeVisible();
    const rows = page.getByRole("region", { name: "Descargar mi ruta" }).getByRole("listitem");
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    await page.getByRole("button", { name: /Descargar mi ruta ·/ }).click();
    await expect(page.getByText(`Tu ruta está lista sin conexión: ${count} órdenes`)).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.getByRole("button", { name: /Descargar mi ruta ·/ })).toHaveCount(0);
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await page.getByRole("button", { name: "Actualizar descarga", exact: true }).click();
    await expect(page.getByText(`Tu ruta está lista sin conexión: ${count} órdenes`)).toBeVisible();
    await expect(page.getByText("Revisa el espacio antes de confirmar.")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Abrir", exact: true })).toHaveCount(count);
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await expect(
      page.getByRole("link", { name: "Trabajar sin conexión", exact: true }),
    ).toHaveCount(count);
    await page.reload();
    await expect(page.getByText("Tus órdenes descargadas siguen disponibles.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Trabajar sin conexión", exact: true }),
    ).toHaveCount(count);
    await expect(page.getByText("Fecha límite:", { exact: false })).toHaveCount(count);
    await expect(page.getByText("Descarga válida hasta:", { exact: false })).toHaveCount(count);
    const cached = await page.evaluate(async () =>
      (
        await Promise.all(
          (await caches.keys()).map(async (name) =>
            (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname),
          ),
        )
      ).flat(),
    );
    expect(cached.every((path) => path.startsWith("/offline-"))).toBe(true);
    await page.getByRole("link", { name: "Trabajar sin conexión", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Trabajo en campo" })).toBeVisible();
    await page.getByLabel("Diagnóstico", { exact: false }).fill("Trabajo conservado sin red");
    await expect(page.getByText("Guardado en este dispositivo", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(notice, { exact: true })).toBeVisible();
    await expect(page.getByLabel("Diagnóstico", { exact: false })).toHaveValue(
      "Trabajo conservado sin red",
    );
    await page
      .getByLabel("Actividades realizadas", { exact: false })
      .fill("Continuar después de recargar");
    await expect(page.getByText("Guardado en este dispositivo", { exact: true })).toBeVisible();
    await page.goto("/maintenance?view=calendar");
    await expect(
      page.getByRole("link", { name: "Trabajar sin conexión", exact: true }),
    ).toHaveCount(count);
    await page.evaluate(() => sessionStorage.removeItem("ice24-offline-scope"));
    await page.reload();
    await expect(
      page.getByText("Reconecta e inicia sesión para verificar el acceso a tus descargas."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Trabajar sin conexión", exact: true }),
    ).toHaveCount(0);
  });
}
