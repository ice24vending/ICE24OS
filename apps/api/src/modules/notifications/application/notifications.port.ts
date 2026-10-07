import type {
  Notification,
  NotificationPage,
  NotificationQuery,
  NotificationResource,
  NotificationSummary,
} from "@ice24/contracts";

/** The recipient is always the authenticated user in the active account; never client input. */
export interface NotificationScope {
  accountId: string;
  userId: string;
  contextSessionId: string | null;
  correlationId: string;
}
export type NotificationTransitionAction = "READ" | "ACKNOWLEDGE" | "START_ATTENTION" | "RESOLVE";
export interface NotificationTransitionCommand {
  action: NotificationTransitionAction;
  resource: NotificationResource | null;
  /** audit.version the caller saw (If-Match); a replayed idempotency key skips the check. */
  expectedVersion: number;
  idempotencyKey: string;
}

export class NotificationNotFoundError extends Error {}
export class NotificationStateError extends Error {}
export class NotificationConditionOpenError extends Error {}
export class NotificationIdempotencyError extends Error {}
export class NotificationResourceError extends Error {}
export class NotificationVersionError extends Error {}

export abstract class NotificationsPort {
  abstract list(scope: NotificationScope, query: NotificationQuery): Promise<NotificationPage>;
  abstract get(scope: NotificationScope, id: string): Promise<Notification | null>;
  abstract summary(scope: NotificationScope): Promise<NotificationSummary>;
  abstract transition(
    scope: NotificationScope,
    id: string,
    command: NotificationTransitionCommand,
  ): Promise<Notification>;
}
