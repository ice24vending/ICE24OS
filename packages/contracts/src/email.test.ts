import { describe, expect, it } from "vitest";
import {
  EMAIL_TEMPLATES,
  emailDeliveryMessageSchema,
  emailProviderEventSchema,
  emailTemplateVariableNames,
  parseEmailTemplateVariables,
  toPublicEmailDeliveryStatus,
  toPublicNotification,
} from "./index.js";

const id = "11111111-1111-4111-8111-111111111111";
const alert = {
  accountName: "Synthetic A",
  title: "Pago de suscripción rechazado",
  message: "El cobro de la suscripción fue rechazado.",
  occurredAt: "2026-10-03T12:00:00.000000Z",
  actionPath: "/subscription",
  actionLabel: "Ver suscripción",
};

describe("email contracts (F5-12)", () => {
  it("pins the variable names of every template version (mirrored by email.templates)", () => {
    expect(emailTemplateVariableNames("alert.critical", 1)).toEqual([
      "accountName",
      "actionLabel",
      "actionPath",
      "message",
      "occurredAt",
      "title",
    ]);
    expect(emailTemplateVariableNames("report.scheduled", 1)).toEqual([
      "accountName",
      "periodLabel",
      "reportName",
      "reportPath",
    ]);
    expect(Object.keys(EMAIL_TEMPLATES).sort()).toEqual(["alert.critical", "report.scheduled"]);
    expect(() => emailTemplateVariableNames("alert.critical", 2)).toThrow(RangeError);
  });

  it("accepts only bounded, non-sensitive variables", () => {
    expect(parseEmailTemplateVariables("alert.critical", 1, alert)).toEqual(alert);
    const invalid = [
      { ...alert, email: "owner@example.test" }, // unknown keys are rejected
      { ...alert, title: "Línea\r\nBcc: x@example.test" }, // header injection
      { ...alert, actionPath: "https://evil.example/phish" }, // only application paths
      { ...alert, actionPath: "/files?token=abc" },
      { ...alert, actionPath: "//evil" }, // protocol-relative link to another host
      { ...alert, actionLabel: null }, // link and label go together
      { ...alert, occurredAt: "ayer" },
      { ...alert, message: "x".repeat(1001) },
    ];
    for (const value of invalid)
      expect(() => parseEmailTemplateVariables("alert.critical", 1, value)).toThrow();
    expect(() =>
      parseEmailTemplateVariables("report.scheduled", 1, {
        accountName: "A",
        reportName: "Mensual",
        periodLabel: "Septiembre 2026",
        reportPath: "/reports/abc",
        attachment: "base64...",
      }),
    ).toThrow();
  });

  it("validates queue messages and provider tracking events", () => {
    expect(
      emailDeliveryMessageSchema.parse({
        messageVersion: 1,
        jobId: id,
        emailMessageId: id,
        accountId: id,
        correlationId: null,
      }),
    ).toBeTruthy();
    expect(() =>
      emailDeliveryMessageSchema.parse({ messageVersion: 2, jobId: id, emailMessageId: id }),
    ).toThrow();
    const event = {
      providerEventId: "evt_1",
      type: "BOUNCED",
      providerMessageId: "local-abc",
      occurredAt: "2026-10-03T12:00:00Z",
    };
    expect(emailProviderEventSchema.parse(event)).toEqual(event);
    // Opens and clicks are not tracked.
    expect(() => emailProviderEventSchema.parse({ ...event, type: "OPENED" })).toThrow();
    expect(() => emailProviderEventSchema.parse({ ...event, recipient: "a@b.io" })).toThrow();
  });

  it("exposes the email state of a notification in public lowercase", () => {
    expect(toPublicEmailDeliveryStatus("DELIVERED")).toBe("delivered");
    const base = {
      id,
      type: "subscription.payment_failed",
      priority: "CRITICAL",
      title: "t",
      message: "m",
      recipientUserId: id,
      sourceType: "Subscription",
      sourceId: id,
      status: "UNREAD",
      action: null,
      occurredAt: "2026-10-03T12:00:00.000000Z",
      readAt: null,
      acknowledgedAt: null,
      inProgressAt: null,
      resolvedAt: null,
      attentionResource: null,
      resolutionResource: null,
      conditionOpen: true,
      channels: ["in_app", "email"],
      createdAt: "2026-10-03T12:00:00.000000Z",
      updatedAt: "2026-10-03T12:00:00.000000Z",
      updatedBy: null,
      rowVersion: 1,
    };
    expect(toPublicNotification(base).emailDelivery).toBeNull();
    expect(
      toPublicNotification({
        ...base,
        emailDelivery: { status: "FAILED", updatedAt: "2026-10-03T12:01:00.000000Z" },
      }).emailDelivery,
    ).toEqual({ status: "failed", updatedAt: "2026-10-03T12:01:00.000000Z" });
  });
});
