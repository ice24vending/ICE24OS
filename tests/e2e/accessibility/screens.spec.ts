/**
 * Accessibility gate (F6-12): axe over every screen and state of tests/visual/ux-review.routes.ts
 * at mobile and desktop width. Zero serious or critical WCAG 2.2 AA violations.
 */
import { expect, test } from "@playwright/test";

import {
  UI_QUALITY,
  UI_QUALITY_BASES,
  openReviewState,
  useReviewState,
} from "../../visual/review-page";
import { REVIEW_ROUTES, REVIEW_VIEWPORTS } from "../../visual/ux-review.routes";
import { seriousViolations } from "./axe";

// Storybook routes are checked story by story in stories.spec.ts.
const SCREENS = REVIEW_ROUTES.filter((route) => !route.storybook);

for (const viewport of REVIEW_VIEWPORTS.filter((item) => item.id !== "tableta"))
  test.describe(viewport.label, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    for (const route of SCREENS)
      for (const state of route.states)
        test(`${route.title} · ${state.label}`, async ({ page, context }) => {
          await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
          await useReviewState(context, route, state, UI_QUALITY_BASES.web);
          const { problems } = await openReviewState(page, route, state, UI_QUALITY_BASES);
          expect(problems, "La pantalla no llegó al estado esperado").toEqual([]);
          expect(await seriousViolations(page)).toEqual([]);
        });
  });
