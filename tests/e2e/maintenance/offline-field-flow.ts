import { expect, type Page } from "@playwright/test";
import {
  DEMO_COOKIE,
  defaultDemoState,
  encodeDemoState,
} from "../../../apps/private-web/src/server/demo/state";
import { UI_QUALITY } from "../../visual/review-page";
import { seriousViolations } from "../accessibility/axe";
import { demoIds, demoUserId } from "../../../apps/private-web/src/server/demo/fixtures";
export async function offlineFieldFlow(
  page: Page,
  baseURL: string,
  onStep?: (label: string) => Promise<void>,
  options: {
    conflict?: boolean;
    lostResponse?: boolean;
    intermittent?: boolean;
    stopAfterQueue?: boolean;
  } = {},
) {
  const context = page.context();
  const state = {
    ...defaultDemoState(),
    persona: "technician" as const,
    ...(options.conflict ? { maintenance: "conflict" as const } : {}),
  };
  await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
  await context.addCookies([
    {
      name: DEMO_COOKIE,
      value: encodeDemoState(state),
      url: baseURL!,
      httpOnly: true,
    },
  ]);
  const id = demoIds.job(2003);
  await page.goto(new URL(`/maintenance/work-orders/${id}/execute`, baseURL).href);
  await onStep?.("1. Descargar la orden antes de salir a campo");
  await page.getByRole("button", { name: "Descargar para trabajar sin conexión" }).click();
  await expect(page.getByRole("link", { name: "Abrir orden descargada" })).toBeVisible();
  await page.getByRole("link", { name: "Abrir orden descargada" }).click();
  await expect(page.getByRole("heading", { name: "Trabajo en campo" })).toBeVisible();
  await context.setOffline(true);
  await onStep?.("2. Sin internet: capturar ejecución y evidencia");
  await page.getByRole("button", { name: /Revisar.*cierre/ }).click();
  await page.getByRole("link", { name: "Completa diagnóstico." }).click();
  await expect(page.getByLabel("Diagnóstico", { exact: false })).toBeFocused();
  await expect(page).toHaveURL(/offline-work\.html/);
  for (const label of [
    "Diagnóstico",
    "Actividades realizadas",
    "Pruebas realizadas",
    "Recomendación",
  ]) {
    await page.getByLabel(label, { exact: false }).fill("Revisión técnica realizada en campo");
    if (options.intermittent) {
      await expect(page.getByText("Guardado en este dispositivo", { exact: true })).toBeVisible();
      await context.setOffline(false);
      await page.reload();
      await context.setOffline(true);
      await expect(page.getByLabel(label, { exact: false })).toHaveValue(
        "Revisión técnica realizada en campo",
      );
    }
  }
  await page.getByLabel("Desconectar la alimentación", { exact: false }).check();
  await page.getByLabel("Inspeccionar el filtro", { exact: false }).check();
  await page.getByLabel("Temperatura de salida (°C)").fill("2");
  await page.getByLabel("Lote del filtro").fill("LOT-OFFLINE");
  await page.getByLabel("Nombre de quien confirma").fill("Ana Torres");
  await page.getByRole("button", { name: "Confirmo la ejecución" }).click();
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 20;
    c.getContext("2d")!.fillRect(0, 0, 20, 20);
    return c.toDataURL("image/png").split(",")[1]!;
  });
  for (const label of ["Foto antes", "Foto después"]) {
    await page.getByLabel(`${label} · mínimo 1`, { exact: true }).setInputFiles({
      name: "foto.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  }
  await expect(page.getByText("Foto y original guardados", { exact: false })).toHaveCount(2);
  await expect(page.getByText("Guardado en este dispositivo", { exact: true })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  await page.reload();
  await onStep?.("3. Recargar sin red: el trabajo sigue guardado");
  await expect(page.getByLabel("Lote del filtro")).toHaveValue("LOT-OFFLINE");
  await expect(page.getByLabel("Temperatura de salida (°C)")).toHaveValue("2");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await seriousViolations(page)).toEqual([]);
  await page.getByRole("button", { name: /Revisar.*cierre/ }).click();
  await page.getByRole("button", { name: "Confirmar cierre" }).click();
  await onStep?.("4. Cierre guardado localmente; todavía no está confirmado por el servidor");
  await expect(
    page.getByText("Cierre guardado en este dispositivo.", { exact: false }),
  ).toBeVisible();
  const hashes = new Map<string, string>();
  if (options.stopAfterQueue) return;
  let count = 0,
    closes = 0;
  await context.route("**/api/files/upload-sessions", (route) =>
    route.fulfill({
      json: {
        fileId: demoIds.job(9700 + ++count),
        uploadUrl: `${baseURL}/fixture-private-upload`,
        method: "PUT",
        requiredHeaders: { "content-type": "image/jpeg" },
        uploadToken: "a".repeat(43),
        expiresAt: "2030-11-02T16:00:00.000Z",
        maximumSizeBytes: 10485760,
      },
    }),
  );
  await context.route("**/fixture-private-upload", (route) =>
    route.fulfill({ status: 200, body: "" }),
  );
  await context.route("**/api/files/*/complete", async (route) => {
    const r = route.request();
    const f = await new Request(r.url(), {
      method: "POST",
      headers: r.headers(),
      body: new Uint8Array(r.postDataBuffer()!),
    }).formData();
    hashes.set(r.url().split("/").at(-2)!, String(f.get("sha256")));
    await route.fulfill({ json: {} });
  });
  await context.route(/\/api\/files\/[0-9a-f-]+$/, (route) => {
    const fileId = route.request().url().split("/").at(-1)!;
    return route.fulfill({
      json: {
        id: fileId,
        currentVersionId: demoIds.job(9800 + count),
        ownerAccountId: demoIds.account(1),
        fileName: "foto.jpg",
        mediaType: "image/jpeg",
        sizeBytes: 100,
        sha256: hashes.get(fileId),
        purpose: "equipment_evidence",
        relatedResource: { type: "machine", id: demoIds.machine(1) },
        visibility: "private",
        status: "available",
        audit: {
          createdAt: UI_QUALITY.demoNow,
          updatedAt: UI_QUALITY.demoNow,
          createdBy: demoUserId("technician"),
          rowVersion: 2,
        },
      },
    });
  });
  page.on("request", (r) => {
    if (r.url().endsWith("/api/synchronization/operations")) closes++;
  });
  if (options.lostResponse) {
    let lost = false;
    await context.route("**/api/synchronization/operations", async (route) => {
      if (lost) return route.continue();
      lost = true;
      await route.fetch(); // Server commits; only the response is lost.
      await route.abort("connectionreset");
      await page.clock.setFixedTime(new Date(Date.parse(UI_QUALITY.demoNow) + 30_000));
    });
  }
  await context.setOffline(false);
  await onStep?.("5. Recuperar señal: subir y verificar fotos antes de cerrar");
  if (options.conflict) {
    await expect(page.getByText("Sincronización: Conflicto", { exact: true }).first()).toBeVisible({
      timeout: 45_000,
    });
    await page.getByRole("link", { name: "Centro de sincronización" }).click();
    await page.getByRole("button", { name: /Revisar conflicto/ }).click();
    await expect(page.getByText(/Modo consulta: solicita/)).toBeVisible();
    await onStep?.("6. El técnico consulta ambas versiones; no puede imponer una resolución");
    await context.addCookies([
      {
        name: DEMO_COOKIE,
        value: encodeDemoState({ ...state, persona: "owner" }),
        url: baseURL,
        httpOnly: true,
      },
    ]);
    await page.reload();
    await page.getByRole("button", { name: /Revisar conflicto/ }).click();
    await page.getByRole("combobox", { name: "Resolución", exact: true }).selectOption("local");
    await page
      .getByLabel("Motivo", { exact: true })
      .fill("Evidencia de campo revisada con el técnico");
    await page.getByRole("button", { name: "Revisar resolución" }).click();
    await page.getByRole("button", { name: "Confirmar resolución", exact: true }).click();
    await expect(page.getByText(/Resuelta: Evidencia de campo/)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await onStep?.("7. Administrador confirma con motivo; originales conservados");
    return;
  }
  await expect(page.getByText("Cierre sincronizado.", { exact: false })).toBeVisible({
    timeout: 45_000,
  });
  expect(count).toBe(2);
  expect(closes).toBe(options.lostResponse ? 2 : 1);
  expect(await seriousViolations(page)).toEqual([]);
  await page.goto(new URL(`/maintenance/work-orders/${id}`, baseURL).href);
  await expect(page.getByText("Completado", { exact: true }).first()).toBeVisible();
  await onStep?.("6. Completado: una sola ejecución registrada");
}
