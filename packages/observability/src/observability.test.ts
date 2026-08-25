import { describe, expect, it } from "vitest";

import { createLogRecord, pseudonymizeIdentifier } from "./index.js";

describe("structured observability", () => {
  it("creates a UTC record with correlation", () => {
    const record = createLogRecord(
      {
        level: "info",
        service: "api",
        environment: "test",
        module: "platform",
        outcome: "success",
        correlationId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b102",
      },
      new Date("2026-08-19T12:00:00.000Z"),
    );
    expect(record.timestamp).toBe("2026-08-19T12:00:00.000Z");
  });

  it("pseudonymizes identifiers deterministically", () => {
    const first = pseudonymizeIdentifier("user-1", "test-salt");
    expect(first).toHaveLength(16);
    expect(first).toBe(pseudonymizeIdentifier("user-1", "test-salt"));
    expect(first).not.toContain("user-1");
  });
});
