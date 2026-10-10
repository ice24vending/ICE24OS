import type { Pool, PoolClient } from "pg";
import { describe, expect, it } from "vitest";
import type { OutboxMessage } from "@ice24/contracts";
import { domainEventConsumers } from "../../consumers/index.js";
import { ConsumerFailure, validateConsumers } from "../domain-events.js";
import { EMAIL_ALERTS_CONSUMER, emailAlertsConsumer } from "./email-alerts.js";
import { addressDigest, processEmailDeliveries } from "./email-deliveries.js";
import { LocalEmailProvider } from "./email/provider.js";
import { NOTIFICATION_CENTER_CONSUMER } from "./notification-center.js";
import { SCHEDULE_RECALC_CONSUMER } from "../schedule-recalc.js";

const id = "11111111-1111-4111-8111-111111111111";
const queueMessage = {
  messageVersion: 1,
  jobId: id,
  emailMessageId: "22222222-2222-4222-8222-222222222222",
  accountId: id,
  correlationId: null,
};
const variables = {
  accountName: "Synthetic A",
  title: "Pago de suscripción rechazado",
  message: "El cobro fue rechazado.",
  occurredAt: "2026-10-03T12:00:00.000000Z",
  actionPath: "/subscription",
  actionLabel: "Ver suscripción",
};
const sendTarget = {
  action: "SEND",
  account_id: id,
  recipient_user_id: id,
  recipient_address: "owner@example.test",
  locale: "es-MX",
  time_zone: "America/Mexico_City",
  template_key: "alert.critical",
  template_version: 1,
  variables,
  idempotency_key: "alert:x:y",
  correlation_id: null,
};

/** Fake pool that records statements and answers the email.* and infra.* functions. */
function fakePool(target: Record<string, unknown>, failOutcome = "retry_scheduled") {
  const calls: { text: string; values: unknown[] }[] = [];
  const query = async (text: string, values: unknown[] = []) => {
    calls.push({ text, values });
    if (text.includes("infra.read_queue"))
      return { rows: [{ msg_id: "7", read_ct: 2, message: queueMessage }] };
    if (text.includes("email.delivery_start")) return { rows: [target] };
    if (text.includes("infra.fail_job")) return { rows: [{ outcome: failOutcome }] };
    return { rows: [] };
  };
  return { pool: { query } as unknown as Pool, calls };
}
const statements = (calls: { text: string }[]) =>
  calls.map((c) => /(email|infra)\.[a-z_]+/u.exec(c.text)?.[0]);

describe("email deliveries processor (F5-12)", () => {
  it("renders, sends with the message id as idempotency key and records SENT before acking", async () => {
    const provider = new LocalEmailProvider();
    const { pool, calls } = fakePool(sendTarget);
    const summary = await processEmailDeliveries(pool, {
      provider,
      baseUrl: "https://app.ice24.test",
    });
    expect(summary).toMatchObject({ received: 1, sent: 1, retried: 0 });
    expect(provider.outbox).toHaveLength(1);
    expect(provider.outbox[0]).toMatchObject({
      idempotencyKey: queueMessage.emailMessageId,
      to: "owner@example.test",
      subject: "[ICE24 OS] Alerta crítica: Pago de suscripción rechazado",
    });
    expect(statements(calls)).toEqual([
      "infra.read_queue",
      "email.delivery_start",
      "email.delivery_record_sent",
      "infra.ack_message",
      "infra.job_finish",
    ]);
    const sent = calls.find((c) => c.text.includes("delivery_record_sent"))!;
    // Only the digest of the address is stored.
    expect(sent.values).toEqual([
      id,
      queueMessage.emailMessageId,
      "local",
      provider.outbox[0]!.providerMessageId,
      addressDigest("Owner@Example.test "),
      2,
    ]);
  });

  it("acknowledges duplicates and rejected recipients without calling the provider", async () => {
    for (const action of ["DONE", "REJECTED"]) {
      const provider = new LocalEmailProvider();
      const { pool, calls } = fakePool({ ...sendTarget, action, recipient_address: null });
      const summary = await processEmailDeliveries(pool, { provider, baseUrl: "https://a.test" });
      expect(provider.calls).toBe(0);
      expect(summary).toMatchObject(action === "DONE" ? { duplicates: 1 } : { skipped: 1 });
      expect(statements(calls)).toContain("infra.ack_message");
    }
  });

  it("schedules a retry on provider failure and records the attempt", async () => {
    const provider = new LocalEmailProvider();
    provider.failWith("PROVIDER_TIMEOUT");
    const { pool, calls } = fakePool(sendTarget);
    const summary = await processEmailDeliveries(pool, { provider, baseUrl: "https://a.test" });
    expect(summary).toMatchObject({ retried: 1, deadLettered: 0 });
    const fail = calls.find((c) => c.text.includes("infra.fail_job"))!;
    expect(fail.values[3]).toBe(2); // the delivery attempt drives the queue backoff
    expect(fail.values[4]).toBe("PROVIDER_TIMEOUT");
    const record = calls.find((c) => c.text.includes("delivery_record_failure"))!;
    expect(record.values).toEqual([id, queueMessage.emailMessageId, "PROVIDER_TIMEOUT", 2, false]);
    expect(statements(calls)).not.toContain("infra.ack_message");
  });

  it("sends permanent rejections and invalid templates straight to the DLQ", async () => {
    const provider = new LocalEmailProvider();
    provider.failWith("PROVIDER_REJECTED");
    const rejected = fakePool(sendTarget, "dead_lettered");
    expect(
      await processEmailDeliveries(rejected.pool, { provider, baseUrl: "https://a.test" }),
    ).toMatchObject({ deadLettered: 1 });
    expect(rejected.calls.find((c) => c.text.includes("infra.fail_job"))!.values[3]).toBe(1_000);

    const healthy = new LocalEmailProvider();
    const invalid = fakePool(
      { ...sendTarget, variables: { ...variables, title: "a\nb" } },
      "dead_lettered",
    );
    await processEmailDeliveries(invalid.pool, { provider: healthy, baseUrl: "https://a.test" });
    expect(healthy.calls).toBe(0);
    expect(invalid.calls.find((c) => c.text.includes("infra.fail_job"))!.values[4]).toBe(
      "TEMPLATE_INVALID",
    );
    expect(invalid.calls.find((c) => c.text.includes("delivery_record_failure"))!.values[4]).toBe(
      true,
    );
  });

  it("dead-letters messages that break the contract or have no job", async () => {
    const provider = new LocalEmailProvider();
    const missing = fakePool({ action: "MISSING" });
    expect(
      await processEmailDeliveries(missing.pool, { provider, baseUrl: "https://a.test" }),
    ).toMatchObject({ deadLettered: 1 });
    expect(statements(missing.calls)).toContain("infra.job_record_poison");
  });
});

describe("email-alerts consumer (F5-12)", () => {
  const event: OutboxMessage = {
    messageVersion: 1,
    eventId: id,
    type: "PaymentFailed",
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
  };
  const tx = (queued: number) =>
    ({ query: async () => ({ rows: [{ queued }] }) }) as unknown as PoolClient;

  it("runs after the notification center, once, with a stable name", () => {
    expect(() => validateConsumers(domainEventConsumers)).not.toThrow();
    expect(domainEventConsumers.map((c) => c.name)).toEqual([
      NOTIFICATION_CENTER_CONSUMER,
      EMAIL_ALERTS_CONSUMER,
      SCHEDULE_RECALC_CONSUMER,
    ]);
  });

  it("retries while the alert is not ingested and succeeds otherwise", async () => {
    await expect(emailAlertsConsumer.handle(event, tx(-1))).rejects.toEqual(
      new ConsumerFailure("NOTIFICATION_NOT_READY"),
    );
    await expect(emailAlertsConsumer.handle(event, tx(0))).resolves.toBeUndefined();
    await expect(emailAlertsConsumer.handle(event, tx(2))).resolves.toBeUndefined();
  });
});
