import { describe, expect, it } from "vitest";

import { resolveCorrelationId } from "./correlation.middleware.js";

describe("resolveCorrelationId", () => {
  it("preserves a valid caller correlation ID", () => {
    const id = "018fc248-74fb-7cc5-bf6f-4dd80ac7b102";
    expect(resolveCorrelationId(id)).toBe(id);
  });

  it("replaces malformed input", () => {
    expect(resolveCorrelationId("not-an-id")).toMatch(/^[0-9a-f-]{36}$/);
  });
});
