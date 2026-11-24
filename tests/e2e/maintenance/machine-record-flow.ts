import { expect, type Page } from "@playwright/test";

/** Shared with the review video: exercise the real cross-module anchor. */
export async function openMachineRecordFromMaintenance(page: Page) {
  const link = page.locator(".maintenance-machine-link").first();
  await expect(link).toBeVisible();
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/machines\/[0-9a-f-]+/);
  await expect(page.locator("main h1")).toBeFocused();
  await expect.poll(async () => (await page.locator("main h1").boundingBox())!.y).toBeLessThan(350);
}
