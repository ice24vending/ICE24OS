import { expect, type Page } from "@playwright/test";
import type { WorkOrder } from "../../../packages/contracts/src/private/maintenance/work-orders";
import { demoExecutionDefinition } from "../../../apps/private-web/src/server/demo/work-order-fixtures";

import { demoIds, demoUserId } from "../../../apps/private-web/src/server/demo/fixtures";
export const executionOrder = (index = 3): WorkOrder => ({
  id: demoIds.job(2000 + index),
  folio: `OT-00000${index + 1}`,
  machineId: demoIds.machine(1),
  machineCode: "ICE24-MTY-0001",
  branchId: demoIds.branch(1),
  sourceType: "ticket",
  sourceId: demoIds.request(900),
  ticketId: demoIds.request(900),
  activityId: null,
  assigneeId: demoUserId("technician"),
  assigneeName: "Ana Torres",
  templateId: demoIds.template(1),
  templateVersion: 1,
  definition: demoExecutionDefinition,
  state: index === 3 ? "in_progress" : "completed",
  dueAt: null,
  alertAt: null,
  rowVersion: 1,
  createdAt: "2026-11-03T16:00:00.000Z",
}); /** Browser/storage doubles; the PostgreSQL suite validates actual state transitions and audit. */
export async function captureExecution(page: Page) {
  const order = executionOrder();
  let next = 0;
  await page.route("**/api/files/upload-sessions", (route) =>
    route.fulfill({
      json: {
        fileId: demoIds.job(9300 + ++next),
        uploadUrl: new URL("/fixture-private-upload", page.url()).href,
        method: "PUT",
        requiredHeaders: { "content-type": "image/jpeg" },
        uploadToken: "a".repeat(43),
        expiresAt: "2030-11-02T16:00:00.000Z",
        maximumSizeBytes: 10485760,
      },
    }),
  );
  await page.route("**/fixture-private-upload", (route) =>
    route.fulfill({ status: 200, body: "" }),
  );
  await page.route("**/api/files/*/complete", (route) =>
    route.fulfill({
      json: {
        id: demoIds.job(9400),
        type: "FILE_SCAN",
        status: "queued",
        createdAt: order.createdAt,
        links: { self: "/jobs/demo" },
      },
    }),
  );
  await page.route(/\/api\/files\/[0-9a-f-]+$/, (route) => {
    const id = route.request().url().split("/").at(-1)!;
    return route.fulfill({
      json: {
        id,
        currentVersionId: demoIds.job(9500 + next),
        ownerAccountId: demoIds.account(1),
        fileName: "evidencia.jpg",
        mediaType: "image/jpeg",
        sizeBytes: 100,
        purpose: "equipment_evidence",
        relatedResource: { type: "machine", id: order.machineId },
        visibility: "private",
        status: "available",
        audit: {
          createdAt: order.createdAt,
          updatedAt: order.createdAt,
          createdBy: demoUserId("technician"),
          rowVersion: 2,
        },
      },
    });
  });
  let submitted: { evidence: unknown[] } | undefined;
  await page.route(`**/api/work-orders/${order.id}/execution`, async (route) => {
    const r = route.request();
    const form = await new Request(r.url(), {
      method: "POST",
      headers: r.headers(),
      body: new Uint8Array(r.postDataBuffer()!),
    }).formData();
    submitted = JSON.parse(String(form.get("data")));
    await route.fulfill({ json: { ...order, rowVersion: 2 } });
  });
  await page.getByLabel("Desconectar la alimentación", { exact: false }).check();
  await page.getByLabel("Inspeccionar el filtro", { exact: false }).check();
  await page.getByLabel("Temperatura de salida (°C)").fill("2");
  await page.getByLabel("Lote del filtro").fill("LOT-26-04");
  await page.getByLabel("Nombre de quien confirma").fill("Ana Torres");
  await page.getByRole("button", { name: "Confirmo la ejecución" }).click();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 20;
    canvas.getContext("2d")!.fillRect(0, 0, 20, 20);
    return canvas.toDataURL("image/png").split(",")[1]!;
  });
  for (const label of ["Foto antes", "Foto después"]) {
    const section = page.getByRole("region", { name: `${label} · mínimo 1` });
    await section.getByLabel(`${label} · mínimo 1`).setInputFiles({
      name: "evidencia.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
    await section.getByRole("button", { name: "Subir archivo", exact: true }).click();
    await section.getByRole("button", { name: /Consultar estado/ }).click();
    await expect(section.getByRole("button", { name: "Subir archivo", exact: true })).toHaveCount(
      0,
    );
  }
  await page.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect(page.getByText("Borrador guardado en el servidor.")).toBeVisible();
  expect(submitted?.evidence).toHaveLength(5);
}
export async function closeExecution(page: Page) {
  const order = executionOrder();
  await page.route(`**/api/work-orders/${order.id}/transitions`, (route) =>
    route.fulfill({ json: { ...order, state: "completed", rowVersion: 3 } }),
  );
  await page.getByRole("button", { name: "Confirmar cierre" }).click();
  await expect(
    page.getByText("Operación registrada. El historial anterior se conserva."),
  ).toBeVisible();
}
export async function correctExecution(page: Page) {
  const order = executionOrder(4);
  await page.route(`**/api/work-orders/${order.id}/reviews`, (route) =>
    route.fulfill({ json: { ...order, state: "corrected", rowVersion: 2 } }),
  );
  await page.getByLabel("Acción", { exact: true }).selectOption("correct");
  await page
    .getByLabel("Motivo obligatorio")
    .fill("Corregir lectura transcrita desde la hoja de campo");
  await page.getByLabel("Temperatura de salida (°C)").fill("3");
  await expect(
    page.getByRole("heading", { name: "Versión conservada y corrección propuesta" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Registrar revisión" }).click();
  await expect(
    page.getByText("Operación registrada. El historial anterior se conserva."),
  ).toBeVisible();
}

export async function reopenExecution(page: Page) {
  const order = executionOrder(4);
  let submitted: { action: string; reason: string } | undefined;
  await page.route("**/api/work-orders/" + order.id + "/reviews", async (route) => {
    const r = route.request();
    const form = await new Request(r.url(), {
      method: "POST",
      headers: r.headers(),
      body: new Uint8Array(r.postDataBuffer()!),
    }).formData();
    submitted = JSON.parse(String(form.get("data")));
    await route.fulfill({ json: { ...order, state: "in_progress", rowVersion: 2 } });
  });
  await page.getByLabel("Acción", { exact: true }).selectOption("reopen");
  await expect(page.getByRole("button", { name: "Registrar reapertura" })).toBeDisabled();
  await page.getByLabel("Motivo obligatorio").fill("Nueva revisión de la falla reportada");
  await page.getByRole("button", { name: "Registrar reapertura" }).click();
  await expect(
    page.getByText("Operación registrada. El historial anterior se conserva."),
  ).toBeVisible();
  expect(submitted).toEqual({ action: "reopen", reason: "Nueva revisión de la falla reportada" });
  await expect(page.getByRole("heading", { name: "Versiones conservadas" })).toBeVisible();
}
