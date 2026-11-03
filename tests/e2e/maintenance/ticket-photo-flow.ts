import type { Page } from "playwright";
import { demoIds } from "../../../apps/private-web/src/server/demo/fixtures";
/** Deterministic storage/API double for the recorded demo; integration tests use PostgreSQL. */
export async function reportTicketWithPhoto(page: Page) {
  const fileId = demoIds.job(950);
  await page.route("**/api/files/upload-sessions", (route) =>
    route.fulfill({
      json: {
        fileId,
        uploadUrl: new URL("/fixture-private-upload", page.url()).href,
        method: "PUT",
        requiredHeaders: { "content-type": "image/png" },
        uploadToken: "a".repeat(43),
        expiresAt: "2030-11-02T16:00:00.000Z",
        maximumSizeBytes: 10485760,
      },
    }),
  );
  await page.route("**/fixture-private-upload", (route) =>
    route.fulfill({ status: 200, body: "" }),
  );
  await page.route(`**/api/files/${fileId}/complete`, (route) =>
    route.fulfill({
      json: {
        id: demoIds.job(951),
        type: "FILE_SCAN",
        status: "queued",
        createdAt: "2026-11-02T16:00:00.000Z",
        links: { self: "/jobs/demo" },
      },
    }),
  );
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/tickets", async (route) => {
    const request = route.request();
    const form = await new Request(request.url(), {
      method: "POST",
      headers: request.headers(),
      body: new Uint8Array(request.postDataBuffer()!),
    }).formData();
    submitted = JSON.parse(String(form.get("data"))) as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      json: {
        ...submitted,
        id: demoIds.request(900),
        folio: "TKT-000001",
        machineCode: "ICE24-MTY-0001",
        systemName: "Refrigeración",
        componentName: null,
        state: "pending_assignment",
        diagnosis: null,
        workOrderId: null,
        rowVersion: 1,
        createdAt: "2026-11-02T16:00:00.000Z",
      },
    });
  });
  await page.getByLabel("Buscar máquina").fill("Juárez");
  await page.getByLabel("Máquina", { exact: true }).selectOption(demoIds.machine(1));
  await page.getByLabel("Sistema", { exact: true }).selectOption(demoIds.catalog(2));
  await page
    .getByLabel("¿Qué falla observaste?")
    .fill("La máquina hace ruido y no produce hielo desde esta mañana.");
  await page.getByLabel("Prioridad", { exact: true }).selectOption("high");
  await page.getByLabel("Archivo a subir").setInputFiles({
    name: "falla.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlS8AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Subir archivo", exact: true }).click();
  await page.getByText("1 evidencia(s) vinculada(s).", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Crear ticket", exact: true }).click();
  await page.getByRole("heading", { name: "Ticket registrado: TKT-000001" }).waitFor();
  return { submitted, fileId };
}
