import type { DomainEventConsumer } from "../processors/domain-events.js";
import { emailAlertsConsumer } from "../processors/notifications/email-alerts.js";
import { notificationCenterConsumer } from "../processors/notifications/notification-center.js";
import { scheduleRecalcConsumer } from "../processors/schedule-recalc.js";

/**
 * Registered domain-event consumers. Each name is part of its idempotency key: never
 * rename a consumer that has processed events. Business consumers (notifications, mail,
 * scheduling) register here in their own tasks; with no subscriber an event is acknowledged
 * and remains in the outbox and central audit. Order matters: consumers of one delivery run
 * in this order, so `email-alerts` sees the alert that `notification-center` created.
 */
export const domainEventConsumers: readonly DomainEventConsumer[] = [
  notificationCenterConsumer,
  emailAlertsConsumer,
  scheduleRecalcConsumer,
];
