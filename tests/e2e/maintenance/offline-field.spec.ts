import { test } from "@playwright/test";
import { offlineFieldFlow } from "./offline-field-flow";
test.use({ viewport: { width: 375, height: 900 } });
test("offline field work survives reload and synchronizes photos before its single closure", async ({
  page,
  baseURL,
}) => {
  await offlineFieldFlow(page, baseURL!);
});
