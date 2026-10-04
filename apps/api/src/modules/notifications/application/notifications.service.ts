import { randomUUID } from "node:crypto";
import { authorize } from "@ice24/authorization";
import {
  acknowledgeNotificationSchema,
  markNotificationReadSchema,
  notificationQuerySchema,
  resolveNotificationSchema,
  startNotificationAttentionSchema,
  type ErrorCode,
  type Notification,
  type NotificationAction,
  type NotificationResource,
} from "@ice24/contracts";
import { HttpException, Inject, Injectable } from "@nestjs/common";
import { getHeader, type SecurityRequest } from "../../../common/security/security-request.js";
import {
  NotificationConditionOpenError,
  NotificationIdempotencyError,
  NotificationNotFoundError,
  NotificationResourceError,
  NotificationsPort,
  NotificationStateError,
  type NotificationScope,
  type NotificationTransitionAction,
} from "./notifications.port.js";

const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{8,128}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** HTTP error carrying the API.md error code; the filter renders the safe message. */
export class NotificationApiError extends HttpException {
  constructor(
    status: number,
    readonly code: ErrorCode,
  ) {
    super(code, status);
  }
}
const fail = (status: number, code: ErrorCode) => new NotificationApiError(status, code);

const ACTIONS: Record<
  NotificationAction,
  {
    action: NotificationTransitionAction;
    resource: (body: unknown) => NotificationResource | null;
  }
> = {
  read: {
    action: "READ",
    resource: (body) => (markNotificationReadSchema.parse(body ?? {}), null),
  },
  acknowledge: {
    action: "ACKNOWLEDGE",
    resource: (body) => (acknowledgeNotificationSchema.parse(body ?? {}), null),
  },
  "start-attention": {
    action: "START_ATTENTION",
    resource: (body) => startNotificationAttentionSchema.parse(body).relatedResource,
  },
  resolve: {
    action: "RESOLVE",
    resource: (body) => resolveNotificationSchema.parse(body).resolutionResource,
  },
};

@Injectable()
export class NotificationsService {
  constructor(@Inject(NotificationsPort) private readonly notifications: NotificationsPort) {}

  /** Re-checks the guard decision; the recipient is always the caller in the active account. */
  private scope(
    request: SecurityRequest,
    permission: "notifications.read" | "notifications.attend",
  ): NotificationScope {
    const subject = request.authorizationSubject;
    const userId = request.localUser?.id;
    if (
      !subject ||
      !userId ||
      !authorize(subject, {
        accountId: subject.membershipAccountId,
        permission,
        classification: "CONFIDENTIAL",
        // Own alert state only (see the controller): never blocked by read-only mode.
        operation: "READ",
      }).allowed
    )
      throw fail(403, "FORBIDDEN");
    const context = getHeader(request, "x-ice24-context-id");
    return {
      accountId: subject.membershipAccountId,
      userId,
      contextSessionId: context !== undefined && UUID.test(context) ? context : null,
      correlationId: request.correlationId ?? randomUUID(),
    };
  }

  /** NOT-001. */
  async list(request: SecurityRequest, input: unknown) {
    const query = notificationQuerySchema.safeParse(input);
    if (!query.success) throw fail(400, "VALIDATION_FAILED");
    return this.notifications.list(this.scope(request, "notifications.read"), query.data);
  }

  /** Badge and group counters for the bell and the center. */
  async summary(request: SecurityRequest) {
    return this.notifications.summary(this.scope(request, "notifications.read"));
  }

  /** NOT-002. Opening a notification does not mark it read; the client calls NOT-003. */
  async get(request: SecurityRequest, id: string): Promise<Notification> {
    const notification = await this.notifications.get(
      this.scope(request, "notifications.read"),
      id,
    );
    if (!notification) throw fail(404, "NOT_FOUND");
    return notification;
  }

  /** NOT-003 to NOT-006: forward-only, idempotent, audited state changes. */
  async transition(
    request: SecurityRequest,
    id: string,
    name: NotificationAction,
    idempotencyKey: unknown,
    body: unknown,
  ): Promise<Notification> {
    const scope = this.scope(request, "notifications.attend");
    if (typeof idempotencyKey !== "string" || !IDEMPOTENCY_KEY.test(idempotencyKey))
      throw fail(400, "VALIDATION_FAILED");
    const definition = ACTIONS[name];
    let resource: NotificationResource | null;
    try {
      resource = definition.resource(body);
    } catch {
      throw fail(400, "VALIDATION_FAILED");
    }
    try {
      return await this.notifications.transition(scope, id, {
        action: definition.action,
        resource,
        idempotencyKey,
      });
    } catch (error) {
      if (error instanceof NotificationNotFoundError) throw fail(404, "NOT_FOUND");
      if (error instanceof NotificationStateError) throw fail(409, "STATE_TRANSITION_INVALID");
      if (error instanceof NotificationConditionOpenError)
        throw fail(409, "RELATED_CONDITION_NOT_RESOLVED");
      if (error instanceof NotificationIdempotencyError) throw fail(409, "IDEMPOTENCY_CONFLICT");
      if (error instanceof NotificationResourceError) throw fail(400, "VALIDATION_FAILED");
      throw error;
    }
  }
}
