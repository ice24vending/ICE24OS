import type { DomainEventConsumer } from "../processors/domain-events.js";
import { notificationCenterConsumer } from "../processors/notifications/notification-center.js";

/**
 * Registered domain-event consumers. Each name is part of its idempotency key: never
 * rename a consumer that has processed events. Business consumers (notifications, mail,
 * scheduling) register here in their own tasks; with no subscriber an event is acknowledged
 * and remains in the outbox and central audit.
 */
export const domainEventConsumers: readonly DomainEventConsumer[] = [notificationCenterConsumer];
