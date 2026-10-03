import { describe, expect, it } from "vitest";
import { outboxEventInputSchema, outboxMessageSchema } from "./outbox.js";

const id = "11111111-1111-4111-8111-111111111111";
const event = () => ({
  type: "SubscriptionActivated",
  aggregateType: "Subscription",
  aggregateId: id,
  accountId: id,
  actor: { type: "USER" as const, userId: id },
  sensitivity: "internal" as const,
  correlationId: id,
  occurredAt: "2026-10-03T12:00:00.000000Z",
});

describe("outbox v1 contract", () => {
  it("applies conservative defaults for version, payload and causation", () => {
    const parsed = outboxEventInputSchema.parse(event());
    expect(parsed).toMatchObject({
      eventVersion: 1,
      aggregateVersion: 0,
      payload: {},
      causationId: null,
      contextSessionId: null,
    });
  });
  it("rejects non past-tense identifiers, unknown fields and impersonating system actors", () => {
    expect(
      outboxEventInputSchema.safeParse({ ...event(), type: "subscription_activated" }).success,
    ).toBe(false);
    expect(outboxEventInputSchema.safeParse({ ...event(), raw: {} }).success).toBe(false);
    expect(
      outboxEventInputSchema.safeParse({ ...event(), actor: { type: "SYSTEM", userId: id } })
        .success,
    ).toBe(false);
    expect(
      outboxEventInputSchema.safeParse({
        ...event(),
        actor: { type: "STRIPE", userId: null },
        contextSessionId: id,
      }).success,
    ).toBe(false);
  });
  it("describes the queue message produced by infra.outbox_message", () => {
    const message = {
      messageVersion: 1,
      eventId: id,
      type: "LoginFailed",
      eventVersion: 1,
      aggregateType: "Identity",
      aggregateId: id,
      aggregateVersion: 0,
      accountId: null,
      actor: { type: "SYSTEM", userId: null },
      contextSessionId: null,
      correlationId: id,
      causationId: null,
      occurredAt: "2026-10-03T12:00:00.123456Z",
      sensitivity: "confidential",
      payload: { result: "DENIED" },
    };
    expect(outboxMessageSchema.parse(message).eventId).toBe(id);
    expect(outboxMessageSchema.safeParse({ ...message, messageVersion: 2 }).success).toBe(false);
  });
});
