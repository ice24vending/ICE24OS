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
  // Dexie schema v2 uses native IndexedDB version 20. Wait for the app's migration, never create an empty database from the fixture.
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await indexedDB.databases()).find((db) => db.name === "ice24-private")?.version,
      ),
    )
    .toBe(20);
  await page.evaluate(async (order) => {
    const owner = {
      accountId: "fixture-account",
      userId: "fixture-user",
      expiresAt: Date.now() + 60_000,
    };
    sessionStorage.setItem("ice24-offline-scope", JSON.stringify(owner));
    const scope = JSON.stringify([owner.accountId, owner.userId]);
    const key = JSON.stringify([owner.accountId, owner.userId, order.id]);
    const metadata = {
      key,
      scope,
      accountId: owner.accountId,
      userId: owner.userId,
      orderId: order.id,
      packageVersion: 1,
      downloadedAt: Date.now(),
      expiresAt: owner.expiresAt,
    };
    const value = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
      "encrypt",
      "decrypt",
    ]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const additionalData = new TextEncoder().encode(
      JSON.stringify([
        "orders",
        key,
        scope,
        order.id,
        1,
        metadata.downloadedAt,
        metadata.expiresAt,
      ]),
    );
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData },
      value,
      new TextEncoder().encode(JSON.stringify({ order })),
    );
    const request = indexedDB.open("ice24-private");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["orders", "keys"], "readwrite");
      tx.objectStore("orders").put({
        ...metadata,
        iv,
        ciphertext,
        bytes: ciphertext.byteLength,
        mimeType: "application/json",
      });
      tx.objectStore("keys").put({
        key: scope,
        value,
        generation: "fixture",
        accountId: owner.accountId,
        userId: owner.userId,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    await navigator.serviceWorker.register("/sw.js?offline=1");
    await navigator.serviceWorker.ready;
  }, order);
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? ""))
    .toContain("offline=1");
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: `${order.folio} · ${order.machineCode}` }),
  ).toBeVisible();
  await expect(
    page.getByText("Disponible sin conexión · Consulta de la versión descargada"),
  ).toBeVisible();
  const cached = await page.evaluate(async () =>
    (
      await Promise.all(
        (await caches.keys()).map(async (name) =>
          (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname),
        ),
      )
    ).flat(),
  );
  expect(cached.sort()).toEqual(["/offline-shell.html", "/offline-shell.js"]);
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
    page.getByText("Esta orden no está descargada para tu usuario y cuenta."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: `${order.folio} · ${order.machineCode}` }),
  ).toHaveCount(0);
});
