import { describe, expect, it } from "vitest";
import {
  integrationDetailsSchema,
  integrationLogQuerySchema,
  integrationLogSchema,
  integrationNameSchema,
} from "./integration-logs.js";

const log = {
  id: "11111111-1111-4111-8111-111111111111",
  integration: "stripe",
  operation: "webhook.receive",
  direction: "INBOUND",
  provider: "stripe",
  status: "FAILED",
  latencyMs: 41,
  responseCode: "503",
  errorCode: "WEBHOOK_PROCESSING_FAILED",
  retryable: true,
  attempt: 2,
  effectKey: "evt_123",
  correlationId: "0a7d1c4e-5f9b-4e2a-8c3d-1b2a3c4d5e6f",
  requestCorrelationId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b102",
  accountId: null,
  jobId: null,
  details: { eventType: "checkout.session.completed" },
  occurredAt: "2026-10-06T10:00:00.000000Z",
};

describe("integration log contracts (F5-14)", () => {
  it("covers the PRD integrations, including PDF before its adapter exists", () => {
    expect(integrationNameSchema.options).toEqual([
      "stripe",
      "email",
      "object_storage",
      "queue",
      "antimalware",
      "pdf",
    ]);
  });

  it("accepts a redacted log and rejects nested details or free-text codes", () => {
    expect(integrationLogSchema.safeParse(log).success).toBe(true);
    expect(integrationDetailsSchema.safeParse({ payload: { card: "x" } }).success).toBe(false);
    expect(integrationLogSchema.safeParse({ ...log, errorCode: "boom happened" }).success).toBe(
      false,
    );
    expect(integrationLogSchema.safeParse({ ...log, attempt: 0 }).success).toBe(false);
  });

  it("parses strict filters with a coherent date range", () => {
    expect(
      integrationLogQuerySchema.parse({ integration: "email", status: "FAILED", limit: "5" }),
    ).toMatchObject({ integration: "email", status: "FAILED", limit: 5 });
    expect(
      integrationLogQuerySchema.safeParse({
        from: "2026-10-06T10:00:00Z",
        to: "2026-10-05T10:00:00Z",
      }).success,
    ).toBe(false);
    expect(integrationLogQuerySchema.safeParse({ provider: "stripe" }).success).toBe(false);
  });
});
