import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_EVENT_RULES,
  SYSTEM_ACTOR_ID,
  notificationQuerySchema,
  resolveNotificationSchema,
  startNotificationAttentionSchema,
  toPublicNotification,
  toPublicNotificationPriority,
  toPublicNotificationStatus,
} from "./notifications.js";

const id = "11111111-1111-4111-8111-111111111111";
const user = "22222222-2222-4222-8222-222222222222";
const now = "2026-10-03T12:00:00.000000Z";
const record = (patch: Record<string, unknown> = {}) => ({
  id,
  type: "subscription.payment_failed",
  priority: "CRITICAL",
  title: "Pago de suscripción rechazado",
  message: "El cobro fue rechazado.",
  recipientUserId: user,
  sourceType: "Subscription",
  sourceId: id,
  status: "READ",
  action: { href: "/subscription", label: "Ver suscripción" },
  occurredAt: now,
  readAt: now,
  acknowledgedAt: null,
  inProgressAt: null,
  resolvedAt: null,
  attentionResource: null,
  resolutionResource: null,
  conditionOpen: true,
  channels: ["in_app"],
  createdAt: now,
  updatedAt: now,
  updatedBy: null,
  rowVersion: 2,
  ...patch,
});

describe("notification contracts", () => {
  it("maps internal states and priorities to the API.md enums", () => {
    expect(toPublicNotificationStatus("IN_PROGRESS")).toBe("in_progress");
    expect(toPublicNotificationStatus("UNREAD")).toBe("unread");
    expect(
      ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) =>
        toPublicNotificationPriority(p as "INFO"),
      ),
    ).toEqual(["info", "info", "warning", "high", "critical"]);
  });

  it("keeps critical alerts pinned after reading and until acknowledged (RF-ALT-006)", () => {
    const read = toPublicNotification(record());
    expect(read).toMatchObject({
      status: "read",
      priority: "critical",
      pinned: true,
      relatedResource: { type: "subscription", id },
      sentChannels: ["in_app"],
      escalationLevel: 0,
      audit: { createdBy: SYSTEM_ACTOR_ID, updatedBy: SYSTEM_ACTOR_ID, version: 2 },
    });
    expect(
      toPublicNotification(record({ status: "ACKNOWLEDGED", acknowledgedAt: now, updatedBy: user }))
        .pinned,
    ).toBe(false);
    expect(toPublicNotification(record({ priority: "HIGH" })).pinned).toBe(false);
  });

  it("validates filters, linked resources and the event catalog", () => {
    expect(notificationQuerySchema.parse({ pinned: "true", limit: "5" })).toMatchObject({
      pinned: true,
      limit: 5,
    });
    expect(notificationQuerySchema.safeParse({ status: "RESOLVED" }).success).toBe(false);
    expect(notificationQuerySchema.safeParse({ userId: user }).success).toBe(false);
    expect(
      startNotificationAttentionSchema.safeParse({ relatedResource: { type: "job", id } }).success,
    ).toBe(true);
    expect(
      resolveNotificationSchema.safeParse({ resolutionResource: { type: "ticket", id } }).success,
    ).toBe(false);
    expect(resolveNotificationSchema.safeParse({}).success).toBe(false);
    expect(Object.keys(NOTIFICATION_EVENT_RULES).sort()).toEqual([
      "EnterReadOnly",
      "FileSecurityAlertRaised",
      "PaymentFailed",
    ]);
  });
});
