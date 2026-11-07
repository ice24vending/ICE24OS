import { expect, type Page } from "@playwright/test";

/** Shared with the review video: exercise the real cross-module anchor. */
export async function openMachineRecordFromMaintenance(page: Page) {
  const link = page.locator(".maintenance-machine-link").first();
  await expect(link).toBeVisible();
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/machines\?machineId=/);
  await expect(page.locator(".machine-record")).toBeFocused();
  await expect
    .poll(async () => (await page.locator(".machine-record").boundingBox())!.y)
    .toBeLessThan(350);
}
