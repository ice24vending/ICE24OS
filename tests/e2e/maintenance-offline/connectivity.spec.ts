import { expect, test } from "@playwright/test";
import { offlineFieldFlow } from "../maintenance/offline-field-flow";
// Different from the server's zone: download expiry must hydrate consistently.
test.use({ timezoneId: "Pacific/Auckland" });
test("detecta conflicto con fotos y permite resolver solo al administrador", async ({
  page,
  baseURL,
}) => {
  await offlineFieldFlow(page, baseURL!, undefined, { conflict: true });
});
test("respuesta perdida después del commit se reenvía sin duplicar el cierre", async ({
  page,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await offlineFieldFlow(page, baseURL!, undefined, { lostResponse: true });
  await expect(page.getByText(/hora de Ciudad de México/)).toBeVisible();
  expect(errors).toEqual([]);
});
test("red intermitente y recargas conservan cada paso de ejecución", async ({ page, baseURL }) => {
  await offlineFieldFlow(page, baseURL!, undefined, { intermittent: true });
});
