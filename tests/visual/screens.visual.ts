/**
 * Visual regression (F6-12): every screen of tests/visual/ux-review.routes.ts, in every state and
 * viewport, plus the design-system foundations and state matrices of Storybook, compared with
 * the approved baselines in tests/visual/__screenshots__. Data and dates are frozen (demo mode
 * with ICE24_DEMO_NOW and a fixed browser clock), fonts are loaded and animations disabled.
 *
 * A changed baseline is a change of screen: it needs UX approval in the PR (see
 * docs/qa/phase-6/ui-quality.md).
 */
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import {
  UI_QUALITY,
  UI_QUALITY_BASES,
  allReviewRoutes,
  openReviewState,
  useReviewState,
} from "./review-page";
import { REVIEW_VIEWPORTS } from "./ux-review.routes";

for (const viewport of REVIEW_VIEWPORTS)
  test.describe(viewport.label, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    for (const route of allReviewRoutes())
      for (const state of route.states)
        test(`${route.title} · ${state.label}`, async ({ page, context }) => {
          await page.clock.setFixedTime(new Date(UI_QUALITY.demoNow));
          await useReviewState(context, route, state, UI_QUALITY_BASES.web);
          const { problems } = await openReviewState(page, route, state, UI_QUALITY_BASES);
          expect(problems, "La pantalla no llegó al estado esperado").toEqual([]);
          await expect(page).toHaveScreenshot(`${route.id}--${state.id}--${viewport.id}.png`, {
            fullPage: true,
            // A new support folio (random UUID) on every denied visit; its text is tested elsewhere.
            mask: [page.locator(".destination-denied__reference code")],
            stylePath: join(import.meta.dirname, "screenshot.css"),
          });
        });
  });
