import { z } from "zod";

const uuid = z.string().uuid();
const timestamp = z.iso.datetime({ offset: true });
/**
 * Paths inside the private application; emails never carry signed or public object URLs.
 * A leading `//` is refused: it would be read as a link to another host.
 */
const appPath = z
  .string()
  .regex(/^\/(?!\/)[a-z0-9/_-]*$/u)
  .max(200);
/** Single-line text: no control characters, so it can never inject headers or markup. */
const line = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[^\p{Cc}]*$/u, "single line without control characters");
const paragraph = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[^\p{Cc}]*$/u);

/**
 * F5-12 transactional email. Message types cover what PRD RF-INT-002 / RF-ALT-003 require from
 * ICE24 OS itself: critical alerts and scheduled reports. Access recovery links are issued and
 * sent by Supabase Auth (ADR-017); routing them through this module is an open decision
 * (DEC-024), so no recovery type exists until it is approved.
 */
export const emailMessageTypeSchema = z.enum(["CRITICAL_ALERT", "SCHEDULED_REPORT"]);

/** Internal delivery states (`email.messages.status`, `notification_delivery_attempts.status`). */
export const internalEmailDeliveryStatusSchema = z.enum([
  "QUEUED",
  "SENT",
  "DELIVERED",
  "BOUNCED",
  "FAILED",
]);
export const emailDeliveryStatusSchema = z.enum([
  "queued",
  "sent",
  "delivered",
  "bounced",
  "failed",
]);
export const toPublicEmailDeliveryStatus = (
  status: z.infer<typeof internalEmailDeliveryStatusSchema>,
): z.infer<typeof emailDeliveryStatusSchema> =>
  status.toLowerCase() as z.infer<typeof emailDeliveryStatusSchema>;

/**
 * Template variables. Every template version declares a strict schema: unknown keys are
 * rejected, values are bounded single lines or paragraphs, links are application paths and no
 * email address, token, payload or sanitary/financial detail is accepted. The same key list is
 * seeded in `email.templates.variables` and checked by SQL before a message is queued.
 */
export const criticalAlertEmailVariablesSchema = z
  .object({
    accountName: line(200),
    title: line(250),
    message: paragraph(1000),
    occurredAt: timestamp,
    actionPath: appPath.nullable(),
    actionLabel: line(80).nullable(),
  })
  .strict()
  .refine((value) => (value.actionPath === null) === (value.actionLabel === null), {
    message: "actionPath and actionLabel go together",
  });
export const scheduledReportEmailVariablesSchema = z
  .object({
    accountName: line(200),
    reportName: line(200),
    periodLabel: line(120),
    reportPath: appPath,
  })
  .strict();

/** Versioned template catalog. Bumping a version adds an entry; old versions stay renderable. */
export const EMAIL_TEMPLATES = {
  "alert.critical": {
    1: { messageType: "CRITICAL_ALERT", variables: criticalAlertEmailVariablesSchema },
  },
  "report.scheduled": {
    1: { messageType: "SCHEDULED_REPORT", variables: scheduledReportEmailVariablesSchema },
  },
} as const;
export type EmailTemplateKey = keyof typeof EMAIL_TEMPLATES;
export const emailTemplateKeySchema = z.enum(
  Object.keys(EMAIL_TEMPLATES) as [EmailTemplateKey, ...EmailTemplateKey[]],
);
export const emailTemplateRefSchema = z
  .object({ key: emailTemplateKeySchema, version: z.number().int().positive() })
  .strict();

const templateEntry = (key: EmailTemplateKey, version: number) => {
  const entry = (EMAIL_TEMPLATES[key] as Record<number, { variables: z.ZodObject }>)[version];
  if (!entry) throw new RangeError(`Unknown email template ${key}@${version}`);
  return entry;
};

/** Sorted variable names of a template version, as seeded in `email.templates.variables`. */
export const emailTemplateVariableNames = (key: EmailTemplateKey, version: number): string[] =>
  Object.keys(templateEntry(key, version).variables.shape).sort();

/** Validates variables against the exact template version; throws ZodError on any mismatch. */
export const parseEmailTemplateVariables = (
  key: EmailTemplateKey,
  version: number,
  variables: unknown,
): Record<string, unknown> =>
  templateEntry(key, version).variables.parse(variables) as Record<string, unknown>;

/**
 * Recipient of a message: always a registered user of the account (RF-RPT-004). The address
 * is resolved by the worker at send time from `identity.users`, never stored in the message.
 */
export const emailRecipientSchema = z
  .object({ accountId: uuid, userId: uuid, requiredPermission: z.string().min(3).max(120) })
  .strict();

/** `email_deliveries` queue message (v1). */
export const emailDeliveryMessageSchema = z
  .object({
    messageVersion: z.literal(1),
    jobId: uuid,
    emailMessageId: uuid,
    accountId: uuid,
    correlationId: uuid.nullable(),
  })
  .strict();

/** Normalized provider tracking event (delivery and bounce only; no opens or clicks). */
export const emailProviderEventTypeSchema = z.enum(["DELIVERED", "BOUNCED"]);
export const emailProviderEventSchema = z
  .object({
    providerEventId: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[A-Za-z0-9._:-]+$/u),
    type: emailProviderEventTypeSchema,
    providerMessageId: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[A-Za-z0-9._:<>@-]+$/u),
    occurredAt: timestamp,
  })
  .strict();

/** Outcome of `email.record_provider_event`. */
export const emailProviderEventOutcomeSchema = z.enum([
  "APPLIED",
  "DUPLICATE",
  "PENDING",
  "IGNORED",
]);

/** Delivery state of the email channel for one notification recipient (additive to API.md). */
export const notificationEmailDeliverySchema = z
  .object({ status: emailDeliveryStatusSchema, updatedAt: timestamp })
  .strict();

export const emailDeliveryBatchSummarySchema = z.object({
  received: z.number().int().nonnegative(),
  sent: z.number().int().nonnegative(),
  duplicates: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  retried: z.number().int().nonnegative(),
  deadLettered: z.number().int().nonnegative(),
});

export type EmailMessageType = z.infer<typeof emailMessageTypeSchema>;
export type EmailDeliveryStatus = z.infer<typeof emailDeliveryStatusSchema>;
export type InternalEmailDeliveryStatus = z.infer<typeof internalEmailDeliveryStatusSchema>;
export type CriticalAlertEmailVariables = z.infer<typeof criticalAlertEmailVariablesSchema>;
export type ScheduledReportEmailVariables = z.infer<typeof scheduledReportEmailVariablesSchema>;
export type EmailRecipient = z.infer<typeof emailRecipientSchema>;
export type EmailDeliveryMessage = z.infer<typeof emailDeliveryMessageSchema>;
export type EmailProviderEvent = z.infer<typeof emailProviderEventSchema>;
export type EmailProviderEventOutcome = z.infer<typeof emailProviderEventOutcomeSchema>;
export type NotificationEmailDelivery = z.infer<typeof notificationEmailDeliverySchema>;
export type EmailDeliveryBatchSummary = z.infer<typeof emailDeliveryBatchSummarySchema>;
