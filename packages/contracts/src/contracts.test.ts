import { describe, expect, it } from "vitest";

import { apiErrorSchema, cursorPageRequestSchema, entityTagForVersion } from "./index.js";

describe("initial HTTP contracts", () => {
  it("normalizes cursor pagination with a bounded default", () => {
    expect(cursorPageRequestSchema.parse({})).toEqual({ limit: 25 });
    expect(() => cursorPageRequestSchema.parse({ limit: 101 })).toThrow();
  });

  it("rejects an unknown error code", () => {
    expect(() =>
      apiErrorSchema.parse({
        error: {
          code: "UNKNOWN",
          message: "No permitido",
          correlationId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b102",
          timestamp: "2026-08-19T12:00:00.000Z",
        },
      }),
    ).toThrow();
  });

  it("creates a weak entity tag from a non-negative version", () => {
    expect(entityTagForVersion(3)).toBe('W/"3"');
    expect(() => entityTagForVersion(-1)).toThrow();
  });
});
