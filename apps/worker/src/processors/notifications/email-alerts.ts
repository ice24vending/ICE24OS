import { NOTIFICATION_SOURCE_EVENT_TYPES, type OutboxMessage } from "@ice24/contracts";
import type { PoolClient } from "pg";
import { ConsumerFailure, type DomainEventConsumer } from "../domain-events.js";

/** Stable consumer name: part of the idempotency key in infra.processed_messages. */
export const EMAIL_ALERTS_CONSUMER = "email-alerts";

/**
 * F5-12 (RF-ALT-003, RF-ALT-008): queues one email per recipient of every CRITICAL alert.
 * Registered after `notification-center`, so the alert and its recipients already exist;
 * `email.enqueue_alert` only writes PostgreSQL (message, EMAIL job, `email_deliveries` queue
 * message, audit) inside this claim transaction and is idempotent by (alert, recipient). The
 * provider is called later by `processEmailDeliveries`, outside any domain-event transaction.
 */
export const emailAlertsConsumer: DomainEventConsumer = {
  name: EMAIL_ALERTS_CONSUMER,
  eventTypes: NOTIFICATION_SOURCE_EVENT_TYPES,
  async handle(event: OutboxMessage, tx: PoolClient): Promise<void> {
    const result = await tx.query<{ queued: number }>(
      "select email.enqueue_alert($1::jsonb) as queued",
      [JSON.stringify(event)],
    );
    // The alert of an enabled rule is not ingested yet: roll back the claim and retry.
    if ((result.rows[0]?.queued ?? 0) < 0) throw new ConsumerFailure("NOTIFICATION_NOT_READY");
  },
};
