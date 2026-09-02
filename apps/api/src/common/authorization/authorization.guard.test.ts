import { describe, expect, it } from "vitest";

import { resolveProtectedResource } from "./authorization.guard.js";

describe("protected deep-link resolution", () => {
  it.each([
    [
      {
        authenticated: false,
        contextActive: false,
        resourceExistsInContext: false,
        allowed: false,
      },
      401,
    ],
    [
      { authenticated: true, contextActive: false, resourceExistsInContext: true, allowed: true },
      403,
    ],
    [
      { authenticated: true, contextActive: true, resourceExistsInContext: false, allowed: true },
      404,
    ],
    [
      { authenticated: true, contextActive: true, resourceExistsInContext: true, allowed: false },
      403,
    ],
    [
      { authenticated: true, contextActive: true, resourceExistsInContext: true, allowed: true },
      200,
    ],
  ] as const)("returns the non-leaking status %#", (input, expected) => {
    expect(resolveProtectedResource(input)).toBe(expected);
  });
});
