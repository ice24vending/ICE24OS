import axe from "axe-core";
import { expect } from "vitest";

/**
 * axe-core on a rendered tree, the equivalent of vitest-axe without the extra dependency (the
 * repository already pins axe-core). Color contrast needs a layout engine: it is checked by
 * `pnpm check:contrast` and in Storybook's accessibility panel.
 */
export async function expectNoAxeViolations(container: Element = document.body) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}
