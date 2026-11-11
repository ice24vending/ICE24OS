import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  DEMO_COOKIE,
  defaultDemoState,
  encodeDemoState,
} from "../../../apps/private-web/src/server/demo/state";
import { executionOrder } from "./execution-flow";
test("minimal gated shell reloads a scoped encrypted package without caching private responses", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    {
      name: DEMO_COOKIE,
      value: encodeDemoState({ ...defaultDemoState(), persona: "technician" }),
      url: baseURL!,
      httpOnly: true,
    },
  ]);
  const order = executionOrder();
  await page.goto(`/maintenance/work-orders/${order.id}/execute`);
  await expect(page.getByRole("heading", { name: "Ejecutar orden" })).toBeVisible();
  await page.getByRole("button", { name: "Descargar para trabajar sin conexión" }).click();
  await expect(page.getByRole("link", { name: "Abrir orden descargada" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? ""))
    .toContain("offline=1");
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Trabajo en campo" })).toBeVisible();
  await expect(page.getByLabel("Diagnóstico", { exact: false })).toBeVisible();
  const photo = page.getByLabel("Foto antes · mínimo 1", { exact: true });
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 20;
    canvas.getContext("2d")!.fillRect(0, 0, 20, 20);
    return canvas.toDataURL("image/png").split(",")[1]!;
  });
  await photo.setInputFiles({
    name: "foto.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await expect(
    photo.locator("xpath=ancestor::section[1]").getByText("1 de 1 fotos", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Quitar foto", exact: true }).click();
  await expect(
    photo.locator("xpath=ancestor::section[1]").getByText("0 de 1 fotos", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /Foto antes/ })).toHaveCount(0);
  const cached = await page.evaluate(async () =>
    (
      await Promise.all(
        (await caches.keys()).map(async (name) =>
          (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname),
        ),
      )
    ).flat(),
  );
  expect(cached.sort()).toEqual([
    "/offline-shell.html",
    "/offline-shell.js",
    "/offline-work.html",
    "/offline-work/app.css",
    "/offline-work/app.js",
  ]);
  await page.evaluate(() =>
    sessionStorage.setItem(
      "ice24-offline-scope",
      JSON.stringify({
        accountId: "fixture-account",
        userId: "other",
        expiresAt: Date.now() + 60_000,
      }),
    ),
  );
  await page.reload();
  await expect(
    page.getByText("Reconecta e inicia sesión para verificar el acceso a tus descargas."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trabajo en campo" })).toHaveCount(0);
});

for (const width of [390, 768, 1280])
  test(`same tab retains route after authenticated reload then offline reload ${width}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.addCookies([
      {
        name: DEMO_COOKIE,
        value: encodeDemoState({ ...defaultDemoState(), persona: "technician" }),
        url: baseURL!,
        httpOnly: true,
      },
    ]);
    await page.goto("/maintenance/work-orders?view=assigned");
    await page.getByRole("button", { name: "Ver mi ruta", exact: true }).click();
    await page.getByRole("button", { name: /Descargar mi ruta ·/ }).click();
    await expect(page.getByText(/Tu ruta está lista sin conexión/)).toBeVisible();
    const count = await page.getByRole("link", { name: "Abrir", exact: true }).count();
    expect(count).toBeGreaterThan(0);
    const labelLines = await page
      .getByRole("link", { name: "Abrir", exact: true })
      .first()
      .evaluate((button) => {
        const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (walker.currentNode.textContent?.trim() !== "Abrir") continue;
          const range = document.createRange();
          range.selectNodeContents(walker.currentNode);
          return range.getClientRects().length;
        }
        return 0;
      });
    expect(labelLines).toBe(1);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: test.info().outputPath("route-online.png"), fullPage: true });
    const scope = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("ice24-offline-scope")!),
    );
    await page.reload(); // Shell rerender must not shorten or erase a successful download hint.
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(sessionStorage.getItem("ice24-offline-scope")!).expiresAt),
      )
      .toBeGreaterThanOrEqual(scope.expiresAt);
    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole("link", { name: "Trabajar sin conexión", exact: true }),
    ).toHaveCount(count);
    await expect(page.getByText(/Reconecta e inicia sesión/)).toHaveCount(0);
    await expect(page.getByText(/Ana Torres/)).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("route-offline.png"), fullPage: true });
    const editorHref = await page
      .getByRole("link", { name: "Trabajar sin conexión", exact: true })
      .first()
      .getAttribute("href");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await page.goto("/maintenance/synchronization");
    await expect(
      page.getByRole("heading", { name: "Centro de sincronización", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Sincronizar", exact: true })).toBeDisabled();
    await expect(page.getByText(/Solo consulta de la cola local/)).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("sync-offline.png"), fullPage: true });
    await page.goto(editorHref!);
    await expect(page.getByRole("heading", { name: "Ejecutar orden", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Administración", exact: true })).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("editor-offline.png"), fullPage: true });
    const navigation = page.getByRole("navigation", { name: "Navegación de la orden descargada" });
    const back = navigation.getByRole("link", { name: "Volver a las órdenes", exact: true });
    expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await navigation.evaluate((el) => getComputedStyle(el).gap)).toBe("16px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByLabel("Diagnóstico", { exact: false }).fill("Guardado antes de volver");
    await expect(page.getByText("Guardado en este dispositivo", { exact: true })).toBeVisible();
    await back.click();
    await expect(page).toHaveURL(/\/maintenance\/work-orders$/);
    await expect(
      page.getByRole("link", { name: "Trabajar sin conexión", exact: true }),
    ).toHaveCount(count);
    await page.goto(editorHref!);
    await expect(page.getByLabel("Diagnóstico", { exact: false })).toHaveValue(
      "Guardado antes de volver",
    );
  });

for (const failure of ["QuotaExceededError", "InvalidStateError"]) {
  test(`top navigation preserves beforeunload confirmation on ${failure}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([
      {
        name: DEMO_COOKIE,
        value: encodeDemoState({ ...defaultDemoState(), persona: "technician" }),
        url: baseURL!,
        httpOnly: true,
      },
    ]);
    await page.goto(`/maintenance/work-orders/${executionOrder().id}/execute`);
    await page.getByRole("button", { name: "Descargar para trabajar sin conexión" }).click();
    await page.getByRole("link", { name: "Abrir orden descargada" }).click();
    const back = page
      .getByRole("navigation", { name: "Navegación de la orden descargada" })
      .getByRole("link", { name: "Volver a las órdenes" });
    await expect(back).toBeVisible();
    // Online navigation uses a real anchor and lands on the server-backed list.
    const editor = page.url();
    await back.click();
    await expect(page).toHaveURL(/\/maintenance\/work-orders$/);
    await expect(
      page.getByRole("heading", { name: "Órdenes de trabajo", exact: true }),
    ).toBeVisible();
    await page.goto(editor);
    await context.setOffline(true);
    await page.evaluate((name) => {
      IDBObjectStore.prototype.put = function () {
        throw new DOMException("Injected storage failure", name);
      };
    }, failure);
    await page.getByLabel("Diagnóstico", { exact: false }).fill("No perder este cambio");
    await expect(
      page.getByText(
        failure === "QuotaExceededError"
          ? /No se guardó el último cambio/
          : /No cierres esta página hasta recuperar el guardado/,
      ),
    ).toBeVisible();
    const dialog = page.waitForEvent("dialog");
    const click = back.click();
    const warning = await dialog;
    expect(warning.type()).toBe("beforeunload");
    await warning.dismiss();
    await click;
    await expect(page).toHaveURL(editor);
    await expect(page.getByLabel("Diagnóstico", { exact: false })).toHaveValue(
      "No perder este cambio",
    );
  });
}

test("content-versioned worker replaces stale v5 CSS without clearing local records", async ({
  page,
  context,
}) => {
  const root = join(process.cwd(), "apps/private-web/public");
  const worker = await readFile(join(root, "sw.js"), "utf8");
  expect(worker).toMatch(/const CACHE_VERSION = "build-[a-f0-9]+"/);
  const legacy = worker.replace(/const CACHE_VERSION = "[^"]+"/, 'const CACHE_VERSION = "v5"');
  const css = await readFile(join(root, "offline-work/app.css"), "utf8");
  const shell = `<!doctype html><html><head><link rel="stylesheet" href="/offline-work/app.css"></head><body><div class="offline-work"><nav class="offline-work__actions offline-work__navigation"><button>Volver</button><button>Sincronización</button></nav></div></body></html>`;
  let phase = 0;
  // A real HTTP origin allows the browser's SW update algorithm and HTTP cache to run.
  // This fixture serves only generic public assets; IndexedDB below contains a test sentinel.
  const server = createServer((request, response) => {
    const path = new URL(request.url!, "http://localhost").pathname;
    response.setHeader("Cache-Control", path.endsWith(".css") ? "max-age=31536000" : "no-store");
    response.setHeader(
      "Content-Type",
      path.endsWith(".css")
        ? "text/css"
        : path.endsWith(".js")
          ? "application/javascript"
          : "text/html",
    );
    response.end(
      path === "/sw.js"
        ? phase < 2
          ? legacy
          : worker
        : path.endsWith(".css")
          ? css + (phase === 0 ? "\n.offline-work__actions { gap: 0px !important; }" : "")
          : path.endsWith(".js")
            ? "// generic fixture asset"
            : shell,
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture port");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await page.goto(`${origin}/offline-work.html`);
    await page.evaluate(async () => {
      await navigator.serviceWorker.register("/sw.js?offline=1");
      await navigator.serviceWorker.ready;
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("cache-upgrade-proof", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("drafts");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("drafts", "readwrite");
          transaction.objectStore("drafts").put("captura conservada", "order");
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      });
    });
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL))
      .toContain("offline=1");
    const gap = () =>
      page.locator(".offline-work__actions").evaluate((el) => getComputedStyle(el).gap);
    await page.reload();
    expect(await gap()).toBe("0px");
    phase = 1; // New CSS alone cannot replace a fixed-version worker's installed cache.
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update());
    await page.reload();
    expect(await gap()).toBe("0px");
    phase = 2; // Build-generated version changes worker bytes and installs the new public shell.
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update());
    await expect
      .poll(() => page.evaluate(() => caches.keys()))
      .toEqual([expect.stringMatching(/^ice24-private-build-/)]);
    await context.setOffline(true);
    await page.reload();
    expect(await gap()).toBe("16px");
    const retained = await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open("cache-upgrade-proof");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const read = db.transaction("drafts").objectStore("drafts").get("order");
            read.onsuccess = () => {
              db.close();
              resolve(read.result);
            };
          };
        }),
    );
    expect(retained).toBe("captura conservada");
    const devtools = await context.newCDPSession(page);
    const cacheStorage = await devtools.send("CacheStorage.requestCacheNames", {
      securityOrigin: origin,
    });
    await test.info().attach("devtools-cache-and-elements", {
      body: JSON.stringify({ cacheStorage, computedGap: await gap(), retained }, null, 2),
      contentType: "application/json",
    });
    await devtools.detach();
  } finally {
    await context.setOffline(false);
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
