import { writeFile, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { chromium, type Route } from "playwright";
import { expect } from "@playwright/test";
import type { Pool } from "pg";
import type {
  WorkOrder,
  WorkOrderDetail,
} from "../../../packages/contracts/src/private/maintenance/work-orders";
import type { OfflineOrderPackage } from "../../../packages/contracts/src/private/maintenance/offline";
import type { SynchronizationConflict } from "../../../packages/contracts/src/private/maintenance/conflicts";
import type { SecurityRequest } from "../../../apps/api/src/common/security/security-request";
import {
  DEMO_COOKIE,
  defaultDemoState,
  encodeDemoState,
} from "../../../apps/private-web/src/server/demo/state";
import { demoIds } from "../../../apps/private-web/src/server/demo/fixtures";
/** Real Chromium + encrypted IndexedDB + transactional PostgreSQL commands.
 * HTTP/auth bootstrap and object storage are adapters; permission checks, versions,
 * conflicts, evidence references, activity updates and audit are the actual application. */
export async function fieldCriterion(input: {
  pool: Pool;
  orders: {
    downloadOffline(
      request: SecurityRequest,
      id: string,
      data: unknown,
    ): Promise<OfflineOrderPackage>;
    syncOffline(
      request: SecurityRequest,
      data: unknown,
    ): Promise<WorkOrder | { conflictId: string; message: string }>;
    releaseOffline(request: SecurityRequest, id: string, data: unknown): Promise<unknown>;
    saveExecution(request: SecurityRequest, id: string, data: unknown): Promise<unknown>;
    listConflicts(
      request: SecurityRequest,
    ): Promise<{ items: SynchronizationConflict[]; canResolve: boolean }>;
    resolveConflict(request: SecurityRequest, id: string, data: unknown): Promise<WorkOrder>;
    detail(request: SecurityRequest, id: string): Promise<WorkOrderDetail>;
  };
  order: WorkOrder;
  accountId: string;
  req: (actor?: string, version?: number, key?: string) => SecurityRequest;
}) {
  const { pool, orders, order, accountId, req } = input;
  const listener = createServer();
  await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
  const port = (listener.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) =>
    listener.close((error) => (error ? reject(error) : resolve())),
  );
  const origin = `http://localhost:${port}`;
  const web = spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL("../../../apps/private-web/node_modules/next/dist/bin/next", import.meta.url),
      ),
      "dev",
      "-p",
      String(port),
      "-H",
      "127.0.0.1",
    ],
    {
      cwd: fileURLToPath(new URL("../../../apps/private-web", import.meta.url)),
      env: {
        ...process.env,
        NODE_ENV: "development",
        ICE24_FIELD_TEST: "1",
        ICE24_DEMO_MODE: "1",
        NEXT_PUBLIC_ICE24_OFFLINE_SHELL: "1",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: "ignore",
      windowsHide: true,
    },
  );
  const browser = await chromium.launch();
  const priorNextEnv = await readFile(
    new URL("../../../apps/private-web/next-env.d.ts", import.meta.url),
    "utf8",
  );
  try {
    await expect
      .poll(
        async () =>
          fetch(origin, { signal: AbortSignal.timeout(3000) })
            .then((r) => r.ok)
            .catch(() => false),
        { timeout: 90_000 },
      )
      .toBe(true);
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      locale: "es-MX",
      timezoneId: "Pacific/Auckland",
      reducedMotion: "reduce",
    });
    const state = { ...defaultDemoState(), persona: "technician" as const };
    await context.addCookies([
      { name: DEMO_COOKIE, value: encodeDemoState(state), url: origin, httpOnly: true },
    ]);
    const page = await context.newPage();
    const diagnostics: string[] = [];
    page.on("pageerror", (e) => diagnostics.push(e.message));
    page.on("request", (r) => {
      if (r.url().includes("synchronization")) diagnostics.push(r.method() + " " + r.url());
    });
    let packet: OfflineOrderPackage | undefined;
    const userId = req("technician").localUser!.id;
    const session = {
      accountId,
      userId,
      contextId: String(req("technician").headers["x-ice24-context-id"]),
      csrfToken: state.csrf,
    };
    const form = async (route: Route) => {
      const r = route.request();
      return new Request(r.url(), {
        method: "POST",
        headers: r.headers(),
        body: new Uint8Array(r.postDataBuffer()!),
      }).formData();
    };
    await context.route("**/api/synchronization/health", (route) =>
      route.fulfill({ json: session }),
    );
    await context.route("**/api/synchronization/lifecycle", (route) =>
      route.fulfill({
        json: { ...session, serverNow: new Date().toISOString(), orderIds: [order.id] },
      }),
    );
    await context.route("**/api/synchronization/orders/*/download", async (route) => {
      const data = JSON.parse(String((await form(route)).get("data")));
      packet = await orders.downloadOffline(req("technician", order.rowVersion), order.id, data);
      await route.fulfill({ json: packet });
    });
    await context.route("**/api/synchronization/operations", async (route) => {
      const fields = await form(route),
        data = JSON.parse(String(fields.get("data")));
      const result = await orders.syncOffline(
        req("technician", Number(fields.get("version")), String(fields.get("key"))),
        data,
      );
      await route.fulfill({
        json:
          "conflictId" in result
            ? { status: "conflict", ...result }
            : { status: "accepted", order: result },
      });
    });
    const files = new Map<string, { version: string; hash: string }>();
    await context.route("**/api/files/upload-sessions", async (route) => {
      const id = randomUUID();
      files.set(id, { version: randomUUID(), hash: "" });
      await route.fulfill({
        json: {
          fileId: id,
          uploadUrl: `${origin}/fixture-storage`,
          method: "PUT",
          requiredHeaders: { "content-type": "image/jpeg" },
          uploadToken: "a".repeat(43),
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          maximumSizeBytes: 10485760,
        },
      });
    });
    await context.route("**/fixture-storage", (route) => route.fulfill({ status: 200, body: "" }));
    await context.route("**/api/files/*/complete", async (route) => {
      const id = route.request().url().split("/").at(-2)!,
        file = files.get(id)!;
      file.hash = String((await form(route)).get("sha256"));
      await pool.query(
        "insert into files.file_objects(id,account_id,category,purpose,status,sensitivity,created_by) values($1,$2,'PHOTO','machine_photo','AVAILABLE','INTERNAL',$3)",
        [id, accountId, userId],
      );
      await pool.query(
        "insert into files.file_versions(id,file_object_id,version_number,storage_zone,object_key,media_type,size_bytes,sha256,scan_status,available_at) values($1,$2,1,'PRIVATE_ORIGINAL',$3,'image/jpeg',100,$4,'CLEAN',now())",
        [file.version, id, `${accountId}/${id}/v1/${randomUUID()}`, file.hash],
      );
      await pool.query(
        "insert into files.file_bindings(file_object_id,entity_type,entity_id) values($1,'MACHINE',$2)",
        [id, order.machineId],
      );
      await route.fulfill({ json: {} });
    });
    await context.route(/\/api\/files\/[0-9a-f-]+$/, (route) => {
      const id = route.request().url().split("/").at(-1)!,
        file = files.get(id)!;
      return route.fulfill({
        json: {
          id,
          currentVersionId: file.version,
          ownerAccountId: accountId,
          fileName: "campo.jpg",
          mediaType: "image/jpeg",
          sizeBytes: 100,
          sha256: file.hash,
          purpose: "equipment_evidence",
          relatedResource: { type: "machine", id: order.machineId },
          visibility: "private",
          status: "available",
          audit: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: userId,
            rowVersion: 2,
          },
        },
      });
    });
    // Playwright route.fulfill bypasses the browser's offline emulation. The HTTP
    // adapters must also disconnect, otherwise background sync can reach the DB.
    let disconnected = false;
    await context.route("**/api/**", (route) =>
      disconnected ? route.abort("internetdisconnected") : route.fallback(),
    );
    await page.goto(`${origin}/maintenance/work-orders/${demoIds.job(2003)}/execute`);
    await page.waitForFunction(() =>
      [...document.querySelectorAll("button")].some(
        (b) =>
          b.textContent?.includes("Descargar para trabajar") &&
          Object.keys(b).some((k) => k.startsWith("__reactProps")),
      ),
    );
    await page.getByRole("button", { name: "Descargar para trabajar sin conexión" }).click();
    await expect(page.getByRole("link", { name: "Abrir orden descargada" }))
      .toBeVisible({ timeout: 20_000 })
      .catch(async (error) => {
        await writeFile(
          new URL("../../../tmp/criterion-error.txt", import.meta.url),
          diagnostics.join("\n") + "\n" + (await page.locator("body").innerText()),
        );
        throw error;
      });
    disconnected = true;
    await context.setOffline(true);
    await page.goto(`${origin}/offline-work.html?order=${order.id}`);
    await expect(page.getByRole("heading", { name: "Trabajo en campo" })).toBeVisible();
    await context.setOffline(true);
    for (const label of [
      "Diagnóstico",
      "Actividades realizadas",
      "Pruebas realizadas",
      "Recomendación",
    ])
      await page
        .getByLabel(label, { exact: false })
        .fill("Servicio realizado sin conexión en campo");
    await page.getByLabel("Desconectar la alimentación", { exact: false }).check();
    await page.getByLabel("Inspeccionar el filtro", { exact: false }).check();
    await page.getByLabel("Temperatura de salida (°C)").fill("2");
    await page.getByLabel("Lote del filtro").fill("CAMPO-F7");
    await page.getByLabel("Nombre de quien confirma").fill("Técnico de campo");
    await page.getByRole("button", { name: "Confirmo la ejecución" }).click();
    const png = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      c.getContext("2d")!.fillRect(0, 0, 32, 32);
      return c.toDataURL().split(",")[1]!;
    });
    for (const label of ["Foto antes", "Foto después"])
      await page.getByLabel(`${label} · mínimo 1`, { exact: true }).setInputFiles({
        name: "campo.png",
        mimeType: "image/png",
        buffer: Buffer.from(png, "base64"),
      });
    await expect(page.getByText("Foto y original guardados", { exact: false })).toHaveCount(2);
    await expect(page.getByText("Guardado en este dispositivo", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Lote del filtro")).toHaveValue("CAMPO-F7");
    await page.getByRole("button", { name: /Revisar.*cierre/ }).click();
    await page.getByRole("button", { name: "Confirmar cierre" }).click();
    await expect(
      page.getByText("Cierre guardado en este dispositivo.", { exact: false }),
    ).toBeVisible();
    await orders.releaseOffline(req("owner", packet!.order.rowVersion), order.id, {
      reason: "Intervención concurrente autorizada",
    });
    await orders.saveExecution(req("technician", packet!.order.rowVersion), order.id, {
      checklist: [],
      fields: {},
      diagnosis: "Diagnóstico concurrente del servidor",
      activitiesPerformed: "",
      parts: [],
      tests: "",
      recommendation: "",
      evidence: [],
      result: "conforming",
      followup: "",
    });
    disconnected = false;
    await context.setOffline(false);
    await expect(page.getByText("Sincronización: Conflicto", { exact: true }).first()).toBeVisible({
      timeout: 45_000,
    });
    await context.addCookies([
      {
        name: DEMO_COOKIE,
        value: encodeDemoState({ ...state, persona: "owner" }),
        url: origin,
        httpOnly: true,
      },
    ]);
    await context.route("**/api/synchronization/conflicts", async (route) =>
      route.fulfill({ json: await orders.listConflicts(req("owner")) }),
    );
    await context.route("**/api/synchronization/conflicts/*/resolve", async (route) => {
      const fields = await form(route),
        id = route.request().url().split("/").at(-2)!;
      const request = req("owner", Number(fields.get("version")), String(fields.get("key")));
      const data = JSON.parse(String(fields.get("data")));
      const result = await orders.resolveConflict(request, id, data);
      expect(await orders.resolveConflict(request, id, data)).toEqual(result);
      await route.fulfill({ json: result });
    });
    await page.goto(`${origin}/maintenance/synchronization`);
    await page
      .getByRole("button", { name: `${order.folio} · Revisar conflicto`, exact: true })
      .click();
    await page.getByRole("combobox", { name: "Resolución", exact: true }).selectOption("local");
    await page
      .getByLabel("Motivo", { exact: true })
      .fill("Evidencia original de campo revisada y confirmada");
    await page.getByRole("button", { name: "Revisar resolución" }).click();
    await page.getByRole("button", { name: "Confirmar resolución", exact: true }).click();
    await expect(page.getByText(/Resuelta: Evidencia original/)).toBeVisible();
    expect((await orders.detail(req(), order.id)).order.state).toBe("completed");
    expect(
      (
        await pool.query(
          "select count(*)::int as n from maintenance.synchronization_conflicts where order_id=$1",
          [order.id],
        )
      ).rows[0].n,
    ).toBe(1);
    expect(
      (
        await pool.query(
          "select count(*)::int as n from maintenance.work_order_executions where order_id=$1 and kind='closure'",
          [order.id],
        )
      ).rows[0].n,
    ).toBe(1);
    expect(
      (
        await pool.query(
          "select count(*)::int as n from equipment.scheduled_activities where id=$1 and status='completed'",
          [order.activityId],
        )
      ).rows[0].n,
    ).toBe(1);
    expect(
      (
        await pool.query(
          "select count(*)::int as n from maintenance.work_orders where activity_id=$1",
          [order.activityId],
        )
      ).rows[0].n,
    ).toBe(1);
    expect(
      (
        await pool.query(
          "select count(*)::int as n from audit.events where entity_id=$1 and operation='WorkOrderSyncConflictResolved'",
          [order.id],
        )
      ).rows[0].n,
    ).toBe(1);
    await context.close();
  } finally {
    await browser.close();
    web.kill();
    await writeFile(
      new URL("../../../apps/private-web/next-env.d.ts", import.meta.url),
      priorNextEnv,
    );
  }
}
