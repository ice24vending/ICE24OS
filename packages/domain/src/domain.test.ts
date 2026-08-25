import { describe, expect, it } from "vitest";

import { DomainError, requireNonEmpty } from "./index.js";

describe("domain primitives", () => {
  it("normalizes required values", () => {
    expect(requireNonEmpty("  ICE24  ", "name")).toBe("ICE24");
  });

  it("rejects empty domain values", () => {
    expect(() => requireNonEmpty(" ", "name")).toThrow(DomainError);
  });
});
