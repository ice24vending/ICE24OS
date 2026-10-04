import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AuthorizationSubject } from "@ice24/authorization";
import { notificationQuerySchema, type Notification } from "@ice24/contracts";
import type { NotificationApiError } from "./notifications.service.js";
import { NotificationsService } from "./notifications.service.js";
import {
  NotificationConditionOpenError,
  NotificationIdempotencyError,
  NotificationNotFoundError,
  NotificationResourceError,
  NotificationStateError,
  type NotificationsPort,
} from "./notifications.port.js";
import { notificationsWhere } from "../infrastructure/notifications.database.js";

const account = randomUUID(),
  user = randomUUID();
const now = "2026-10-03T12:00:00.000000Z";
const notification: Notification = {
  id: randomUUID(),
  type: "subscription.payment_failed",
  priority: "critical",
  title: "Pago de suscripción rechazado",
  message: "El cobro fue rechazado.",
  recipientUserId: user,
  relatedResource: { type: "subscription", id: randomUUID() },
  status: "unread",
  pinned: true,
  sentChannels: ["in_app"],
  escalationLevel: 0,
  occurredAt: now,
  readAt: null,
  acknowledgedAt: null,
  inProgressAt: null,
  resolvedAt: null,
  attentionResource: null,
  resolutionResource: null,
  conditionOpen: true,
  emailDelivery: null,
  audit: {
    createdAt: now,
    createdBy: "00000000-0000-4000-8000-000000000000",
    updatedAt: now,
    updatedBy: "00000000-0000-4000-8000-000000000000",
    version: 1,
  },
};
function subject(codes: string[]): AuthorizationSubject {
  return {
    userId: user,
    membershipId: randomUUID(),
    membershipAccountId: account,
    membershipStatus: "ACTIVE",
    contextActive: true,
    accountAccessMode: "ACTIVE",
    assuranceLevel: "aal1",
    permissions: codes.map((code) => ({ code, effect: "ALLOW", classification: "CONFIDENTIAL" })),
    accountWide: false,
    branchIds: new Set(),
    machineIds: new Set(),
  };
}
function setup(codes = ["notifications.read", "notifications.attend"]) {
  const port = {
    list: vi.fn().mockResolvedValue({ items: [], page: { hasMore: false, nextCursor: null } }),
    get: vi.fn().mockResolvedValue(notification),
    summary: vi.fn(),
    transition: vi.fn().mockResolvedValue({ ...notification, status: "acknowledged" }),
  };
  const context = randomUUID();
  const request = {
    authorizationSubject: subject(codes),
    localUser: { id: user },
    correlationId: randomUUID(),
    headers: { "x-ice24-context-id": context },
  };
  return {
    port,
    context,
    request: request as never,
    service: new NotificationsService(port as unknown as NotificationsPort),
  };
}
const code = (error: unknown) => (error as NotificationApiError).code;
const status = (error: unknown) => (error as NotificationApiError).getStatus();

describe("notification center service", () => {
  it("scopes every query to the caller and the active account, never to client input", async () => {
    const { service, port, request, context } = setup(["notifications.read"]);
    await service.list(request, { status: "unread", limit: "10" });
    expect(port.list).toHaveBeenCalledWith(
      {
        accountId: account,
        userId: user,
        contextSessionId: context,
        correlationId: expect.any(String),
      },
      expect.objectContaining({ status: "unread", limit: 10 }),
    );
    const error = await service.list(request, { recipientUserId: randomUUID() }).catch((e) => e);
    expect(code(error)).toBe("VALIDATION_FAILED");
  });

  it("requires notifications.read to read and notifications.attend to change state", async () => {
    const none = setup([]);
    expect(code(await none.service.summary(none.request).catch((e) => e))).toBe("FORBIDDEN");
    const reader = setup(["notifications.read"]);
    const error = await reader.service
      .transition(reader.request, notification.id, "read", "key-12345678", {})
      .catch((e) => e);
    expect(status(error)).toBe(403);
    expect(reader.port.transition).not.toHaveBeenCalled();
  });

  it("answers 404 for notifications outside the caller's inbox", async () => {
    const { service, port, request } = setup();
    port.get.mockResolvedValue(null);
    expect(code(await service.get(request, randomUUID()).catch((e) => e))).toBe("NOT_FOUND");
  });

  it("validates the idempotency key and the linked resource of each action", async () => {
    const { service, port, request } = setup();
    for (const key of [undefined, "short", "bad key with spaces"])
      expect(
        code(await service.transition(request, notification.id, "read", key, {}).catch((e) => e)),
      ).toBe("VALIDATION_FAILED");
    expect(
      code(
        await service
          .transition(request, notification.id, "start-attention", "key-12345678", {})
          .catch((e) => e),
      ),
    ).toBe("VALIDATION_FAILED");
    expect(
      code(
        await service
          .transition(request, notification.id, "resolve", "key-12345678", {
            resolutionResource: { type: "order", id: randomUUID() },
          })
          .catch((e) => e),
      ),
    ).toBe("VALIDATION_FAILED");
    const resource = { type: "subscription" as const, id: randomUUID() };
    await service.transition(request, notification.id, "resolve", "key-12345678", {
      resolutionResource: resource,
    });
    expect(port.transition).toHaveBeenCalledWith(expect.any(Object), notification.id, {
      action: "RESOLVE",
      resource,
      idempotencyKey: "key-12345678", // gitleaks:allow
    });
    await service.transition(request, notification.id, "acknowledge", "key-87654321", undefined);
    expect(port.transition).toHaveBeenLastCalledWith(expect.any(Object), notification.id, {
      action: "ACKNOWLEDGE",
      resource: null,
      idempotencyKey: "key-87654321", // gitleaks:allow
    });
  });

  it("maps database outcomes to API.md error codes", async () => {
    const { service, port, request } = setup();
    const cases: [Error, number, string][] = [
      [new NotificationNotFoundError(), 404, "NOT_FOUND"],
      [new NotificationStateError(), 409, "STATE_TRANSITION_INVALID"],
      [new NotificationConditionOpenError(), 409, "RELATED_CONDITION_NOT_RESOLVED"],
      [new NotificationIdempotencyError(), 409, "IDEMPOTENCY_CONFLICT"],
      [new NotificationResourceError(), 400, "VALIDATION_FAILED"],
    ];
    for (const [cause, httpStatus, errorCode] of cases) {
      port.transition.mockRejectedValueOnce(cause);
      const error = await service
        .transition(request, notification.id, "acknowledge", "key-12345678", {})
        .catch((e) => e);
      expect([status(error), code(error)]).toEqual([httpStatus, errorCode]);
    }
  });
});

describe("notification inbox query", () => {
  const scope = { accountId: account, userId: user, contextSessionId: null, correlationId: user };
  it("always filters by account and recipient and binds every filter", () => {
    const { where, values } = notificationsWhere(
      scope,
      notificationQuerySchema.parse({
        status: "in_progress",
        priority: "info",
        type: "files.security_alert",
        pinned: "true",
        unacknowledged: "false",
      }),
    );
    expect(where.startsWith("r.account_id=$1::uuid and r.user_id=$2::uuid")).toBe(true);
    expect(values).toEqual([
      account,
      user,
      "IN_PROGRESS",
      ["INFO", "LOW"],
      "files.security_alert",
      true,
    ]);
    expect(where).toContain("r.status not in ('UNREAD','READ')");
    expect(where).not.toMatch(/files\.security_alert|IN_PROGRESS/u);
  });
  it("rejects tampered cursors", () => {
    expect(() => notificationsWhere(scope, { cursor: "bm90LWpzb24" })).toThrow("Invalid");
    const forged = Buffer.from(JSON.stringify(["x' or 1=1 --", user])).toString("base64url");
    expect(() => notificationsWhere(scope, { cursor: forged })).toThrow("Invalid");
  });
});
