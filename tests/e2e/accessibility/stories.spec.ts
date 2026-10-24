/**
 * Accessibility gate for the design system (F6-12): axe over every story of the static Storybook
 * (`pnpm storybook:build`), the same check the Accessibility panel shows while designing.
 */
import { expect, test } from "@playwright/test";

import { UI_QUALITY_BASES, storybookStories } from "../../visual/review-page";
import { seriousViolations } from "./axe";

for (const story of storybookStories())
  test(`${story.title} · ${story.id}`, async ({ page }) => {
    await page.goto(
      `${UI_QUALITY_BASES.storybook}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`,
    );
    await page.waitForFunction(
      () => (document.querySelector("#storybook-root")?.childElementCount ?? 0) > 0,
    );
    expect(await seriousViolations(page)).toEqual([]);
  });
