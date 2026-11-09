import { expect, test, type Page } from "@playwright/test";
import {
  DEMO_COOKIE,
  defaultDemoState,
  encodeDemoState,
  type DemoState,
} from "../../../apps/private-web/src/server/demo/state";
import { demoIds } from "../../../apps/private-web/src/server/demo/fixtures";
import { UI_QUALITY } from "../../visual/review-page";
const id = demoIds.job(2003);
async function select(page: Page, baseURL: string, state: DemoState) {
  await page
    .context()
    .addCookies([
      { name: DEMO_COOKIE, value: encodeDemoState(state), url: baseURL, httpOnly: true },
    ]);
}
async function download(page: Page, baseURL: string, clockOffset = 0) {
  const state = { ...defaultDemoState(), persona: "technician" as const };
  await page.clock.setFixedTime(new Date(Date.parse(UI_QUALITY.demoNow) + clockOffset));
  await select(page, baseURL, state);
  await page.goto(`/maintenance/work-orders/${id}/execute`);
  await page.getByRole("button", { name: "Descargar para trabajar sin conexión" }).click();
  await page.getByRole("link", { name: "Abrir orden descargada" }).click();
  await expect(page.getByRole("heading", { name: "Trabajo en campo" })).toBeVisible();
  await page.getByLabel("Diagnóstico", { exact: false }).fill("Diagnóstico pendiente en campo");
  await expect(page.getByText("Guardado en este dispositivo", { exact: true })).toBeVisible();
  return state;
}
async function counts(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open("ice24-private");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const names = ["orders", "drafts", "evidence", "operations", "pendingOperations", "keys"];
    const tx = db.transaction(names, "readonly");
    const result = await Promise.all(
      names.map(
        (name) =>
          new Promise<number>((resolve, reject) => {
            const r = tx.objectStore(name).count();
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
          }),
      ),
    );
    db.close();
    return result;
  });
}
for (const trigger of ["revoked", "deactivated", "branch", "account", "global"] as const) {
  test(`cleans every protected store on reconnect after ${trigger}`, async ({
    page,
    context,
    baseURL,
  }) => {
    const state = await download(page, baseURL!);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByLabel("Diagnóstico", { exact: false })).toHaveValue(
      "Diagnóstico pendiente en campo",
    );
    if (trigger === "global") await context.clearCookies();
    else
      await select(page, baseURL!, {
        ...state,
        ...(trigger === "branch"
          ? { branch: demoIds.branch(2) }
          : trigger === "account"
            ? { account: "bajio", branch: demoIds.branch(3) }
            : { maintenance: trigger }),
      });
    await context.setOffline(false);
    await expect.poll(() => counts(page), { timeout: 20_000 }).toEqual([0, 0, 0, 0, 0, 0]);
    await expect(page.getByLabel("Diagnóstico", { exact: false })).toHaveCount(0);
  });
}
test("expires offline downloads and removes their keys", async ({ page, context, baseURL }) => {
  await download(page, baseURL!);
  await context.setOffline(true);
  await page.clock.setFixedTime(new Date(Date.parse(UI_QUALITY.demoNow) + 73 * 3600_000));
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect.poll(() => counts(page)).toEqual([0, 0, 0, 0, 0, 0]);
});
test("keeps drafts during an intermittent service failure", async ({ page, context, baseURL }) => {
  await download(page, baseURL!);
  await context.route("**/api/synchronization/lifecycle", (route) =>
    route.fulfill({ status: 503, json: { message: "Servicio temporalmente no disponible" } }),
  );
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByLabel("Diagnóstico", { exact: false })).toHaveValue(
    "Diagnóstico pendiente en campo",
  );
  expect((await counts(page))[0]).toBe(1);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("Diagnóstico", { exact: false })).toHaveValue(
    "Diagnóstico pendiente en campo",
  );
});
test("a second device cannot take an active download", async ({ page, browser, baseURL }) => {
  const state = await download(page, baseURL!);
  const second = await browser.newContext({ viewport: { width: 375, height: 812 } });
  try {
    const other = await second.newPage();
    await select(other, baseURL!, state);
    await other.goto(`${baseURL}/maintenance/work-orders/${id}/execute`);
    const response = other.waitForResponse((r) =>
      r.url().endsWith(`/api/synchronization/orders/${id}/download`),
    );
    await other.getByRole("button", { name: "Descargar para trabajar sin conexión" }).click();
    expect((await response).status()).toBe(409);
    await expect(other.getByRole("link", { name: "Abrir orden descargada" })).toHaveCount(0);
    await expect(
      other.getByText("No fue posible sincronizar. Conservamos tus datos."),
    ).toBeVisible();
    await expect(page.getByLabel("Diagnóstico", { exact: false })).toHaveValue(
      "Diagnóstico pendiente en campo",
    );
  } finally {
    await second.close();
  }
});
test("a device clock five days ahead can open and reload a fresh package offline", async ({
  page,
  context,
  baseURL,
}) => {
  await download(page, baseURL!, 5 * 86400_000);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("Diagnóstico", { exact: false })).toHaveValue(
    "Diagnóstico pendiente en campo",
  );
});
test("closing a tab mid-transaction rolls back the incomplete write", async ({
  page,
  context,
  baseURL,
}) => {
  await download(page, baseURL!);
  await context.setOffline(true);
  const url = page.url();
  await page.evaluate(async () => {
    const request = indexedDB.open("ice24-private");
    const db = await new Promise<IDBDatabase>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
    const tx = db.transaction("drafts", "readwrite");
    tx.objectStore("drafts").clear();
    const keepAlive = () => {
      const r = tx.objectStore("drafts").get("hold");
      r.onsuccess = keepAlive;
    };
    keepAlive();
  });
  const savedScope = await page.evaluate(() => sessionStorage.getItem("ice24-offline-scope"));
  await page.close();
  const reopened = await context.newPage();
  await reopened.addInitScript(
    (scope) => sessionStorage.setItem("ice24-offline-scope", scope!),
    savedScope,
  );
  await reopened.goto(url);
  await expect(reopened.getByLabel("Diagnóstico", { exact: false })).toHaveValue(
    "Diagnóstico pendiente en campo",
  );
});
test("voluntary sign-out removes the downloaded draft and key", async ({ page, baseURL }) => {
  await download(page, baseURL!);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Cerrar todas las sesiones" }).click();
  await expect.poll(() => counts(page)).toEqual([0, 0, 0, 0, 0, 0]);
});
test("a large pending photo near the browser quota fails atomically without losing the draft", async ({
  page,
  context,
  baseURL,
}) => {
  await download(page, baseURL!);
  await context.setOffline(true);
  // A deterministic quota race: enough space at preflight, exhausted after the derivative
  // was written but before the original. Chromium's quota override does not constrain this
  // incognito context reliably; inject the same native IndexedDB exception instead.
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (
        this.name === "evidence" &&
        typeof value?.key === "string" &&
        String(JSON.parse(value.key)[2]).endsWith(":original")
      )
        throw new DOMException("Photo exceeded the remaining storage quota", "QuotaExceededError");
      return key === undefined ? put.call(this, value) : put.call(this, value, key);
    };
  });
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext("2d")!,
      data = ctx.createImageData(1024, 1024);
    for (let offset = 0; offset < data.data.length; offset += 65536)
      crypto.getRandomValues(data.data.subarray(offset, offset + 65536));
    ctx.putImageData(data, 0, 0);
    return canvas.toDataURL("image/png").split(",")[1]!;
  });
  await page.getByLabel("Foto antes · mínimo 1", { exact: true }).setInputFiles({
    name: "grande.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await expect(page.getByText("No fue posible guardar la foto.", { exact: false })).toBeVisible();
  expect((await counts(page)).slice(2, 5)).toEqual([0, 0, 0]);
  await expect(page.getByLabel("Diagnóstico", { exact: false })).toHaveValue(
    "Diagnóstico pendiente en campo",
  );
});
