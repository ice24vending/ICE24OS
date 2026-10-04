import { NOTIFICATION_SOURCE_EVENT_TYPES, type OutboxMessage } from "@ice24/contracts";
import type { PoolClient } from "pg";
import type { DomainEventConsumer } from "../domain-events.js";

/** Stable consumer name: part of the idempotency key in infra.processed_messages. */
export const NOTIFICATION_CENTER_CONSUMER = "notification-center";

/**
 * F5-11: turns domain events listed in NOTIFICATION_EVENT_RULES into persistent alerts.
 * `notifications.ingest_event` runs inside the consumer's claim transaction, resolves the
 * recipients (audience permission + scope), records the in-app delivery and the central audit,
 * and is itself idempotent by origin event, so a redelivered message never duplicates alerts.
 */
export const notificationCenterConsumer: DomainEventConsumer = {
  name: NOTIFICATION_CENTER_CONSUMER,
  eventTypes: NOTIFICATION_SOURCE_EVENT_TYPES,
  async handle(event: OutboxMessage, tx: PoolClient): Promise<void> {
    await tx.query("select notifications.ingest_event($1::jsonb)", [JSON.stringify(event)]);
  },
};
