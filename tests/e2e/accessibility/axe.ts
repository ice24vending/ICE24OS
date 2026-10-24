import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/** WCAG 2.2 AA and everything it includes (A and AA of 2.0 and 2.1). */
export const WCAG_22_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * Elements left out of the check, each justified in docs/qa/phase-6/a11y-exceptions.md. No rule
 * is disabled.
 */
export const A11Y_EXCEPTIONS = [
  // A-01: counterexamples of the «Contraste» foundation story, unreadable on purpose.
  ".contrast-sample--forbidden",
];

/**
 * Serious and critical WCAG 2.2 AA violations of the page, readable in the test report. The
 * Storybook a11y addon runs axe inside each story too; a run that collides with it is retried.
 */
export async function seriousViolations(page: Page) {
  let results: Awaited<ReturnType<AxeBuilder["analyze"]>> | undefined;
  for (let attempt = 0; !results; attempt++) {
    try {
      let builder = new AxeBuilder({ page }).withTags(WCAG_22_AA);
      for (const selector of A11Y_EXCEPTIONS) builder = builder.exclude(selector);
      results = await builder.analyze();
    } catch (cause) {
      if (attempt >= 20 || !String(cause).includes("Axe is already running")) throw cause;
      await page.waitForTimeout(250);
    }
  }
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.slice(0, 5).map((node) => node.target.join(" ")),
    }));
}
