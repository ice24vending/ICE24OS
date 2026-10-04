import type { Pool, PoolClient } from "pg";
import { describe, expect, it } from "vitest";
import { NOTIFICATION_EVENT_RULES, type OutboxMessage } from "@ice24/contracts";
import { domainEventConsumers } from "../../consumers/index.js";
import { processDomainEvents, validateConsumers } from "../domain-events.js";
import { NOTIFICATION_CENTER_CONSUMER, notificationCenterConsumer } from "./notification-center.js";

const id = "11111111-1111-4111-8111-111111111111";
const message = (type: string): OutboxMessage => ({
  messageVersion: 1,
  eventId: id,
  type,
  eventVersion: 1,
  aggregateType: "Subscription",
  aggregateId: id,
  aggregateVersion: 2,
  accountId: id,
  actor: { type: "STRIPE", userId: null },
  contextSessionId: null,
  correlationId: id,
  causationId: null,
  occurredAt: "2026-10-03T12:00:00.000000Z",
  sensitivity: "internal",
  payload: { status: "payment_failed" },
});

describe("notification center consumer", () => {
  it("is registered once, with a stable name, for exactly the catalogued event types", () => {
    expect(() => validateConsumers(domainEventConsumers)).not.toThrow();
    expect(
      domainEventConsumers.filter((c) => c.name === NOTIFICATION_CENTER_CONSUMER),
    ).toHaveLength(1);
    expect([...notificationCenterConsumer.eventTypes].sort()).toEqual(
      Object.keys(NOTIFICATION_EVENT_RULES).sort(),
    );
  });

  it("ingests the whole versioned message inside the claim transaction", async () => {
    const calls: { text: string; values?: unknown[] | undefined }[] = [];
    const tx = {
      query: async (text: string, values?: unknown[]) => {
        calls.push({ text, values });
        return { rows: [] };
      },
    } as unknown as PoolClient;
    await notificationCenterConsumer.handle(message("PaymentFailed"), tx);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.text).toBe("select notifications.ingest_event($1::jsonb)");
    expect(JSON.parse(String(calls[0]!.values?.[0]))).toMatchObject({
      type: "PaymentFailed",
      eventId: id,
      accountId: id,
    });
  });

  it("is only invoked for alert-producing events; others are acknowledged untouched", async () => {
    const statements: string[] = [];
    const query = async (text: string) => {
      statements.push(text);
      if (text.includes("infra.read_queue"))
        return {
          rows: [message("LoginFailed"), message("PaymentFailed")].map((m, i) => ({
            msg_id: String(i + 1),
            read_ct: 1,
            message: m,
          })),
        };
      if (text.includes("infra.claim_message")) return { rows: [{ claimed: true }] };
      if (text.includes("infra.job_start_delivery")) return { rows: [{ job_id: "job-1" }] };
      return { rows: [] };
    };
    const pool = { query, connect: async () => ({ query, release: () => undefined }) };
    const summary = await processDomainEvents(pool as unknown as Pool, [
      notificationCenterConsumer,
    ]);
    expect(summary).toMatchObject({ received: 2, processed: 1, unhandled: 1 });
    expect(statements.filter((s) => s.includes("notifications.ingest_event"))).toHaveLength(1);
  });
});
