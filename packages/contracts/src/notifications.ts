import { z } from "zod";
import {
  internalEmailDeliveryStatusSchema,
  notificationEmailDeliverySchema,
  toPublicEmailDeliveryStatus,
} from "./email.js";
import { createCursorPageSchema, cursorPageRequestSchema } from "./pagination.js";

const uuid = z.string().uuid();
const timestamp = z.iso.datetime({ offset: true });

/** Technical identity used in `audit.createdBy` for alerts created by the platform. */
export const SYSTEM_ACTOR_ID = "00000000-0000-4000-8000-000000000000";

/** Internal states (Database `notification_recipients.status`). */
export const internalNotificationStatusSchema = z.enum([
  "UNREAD",
  "READ",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "RESOLVED",
]);
export const notificationStatusSchema = z.enum([
  "unread",
  "read",
  "acknowledged",
  "in_progress",
  "resolved",
]);
export const toPublicNotificationStatus = (
  status: z.infer<typeof internalNotificationStatusSchema>,
): z.infer<typeof notificationStatusSchema> =>
  status.toLowerCase() as z.infer<typeof notificationStatusSchema>;

/** Database priorities (`notification_events.priority`) and the API.md `Notification` enum. */
export const internalNotificationPrioritySchema = z.enum([
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);
export const notificationPrioritySchema = z.enum(["info", "warning", "high", "critical"]);
export const toPublicNotificationPriority = (
  priority: z.infer<typeof internalNotificationPrioritySchema>,
): z.infer<typeof notificationPrioritySchema> => {
  switch (priority) {
    case "INFO":
    case "LOW":
      return "info";
    case "MEDIUM":
      return "warning";
    case "HIGH":
      return "high";
    case "CRITICAL":
      return "critical";
  }
};
export const NOTIFICATION_PRIORITY_FILTER: Record<
  z.infer<typeof notificationPrioritySchema>,
  readonly z.infer<typeof internalNotificationPrioritySchema>[]
> = {
  info: ["INFO", "LOW"],
  warning: ["MEDIUM"],
  high: ["HIGH"],
  critical: ["CRITICAL"],
};

/**
 * Domain events that become alerts. Mirrors `notifications.event_rules` (seeded by migration,
 * checked by pgTAP); adding a rule requires a migration and this catalog in the same change.
 */
export const NOTIFICATION_EVENT_RULES = {
  PaymentFailed: {
    type: "subscription.payment_failed",
    priority: "CRITICAL",
    audiencePermission: "notifications.billing-alerts",
  },
  EnterReadOnly: {
    type: "subscription.read_only",
    priority: "CRITICAL",
    audiencePermission: "notifications.billing-alerts",
  },
  FileSecurityAlertRaised: {
    type: "files.security_alert",
    priority: "HIGH",
    audiencePermission: "notifications.security-alerts",
  },
} as const satisfies Record<
  string,
  {
    type: string;
    priority: z.infer<typeof internalNotificationPrioritySchema>;
    audiencePermission: string;
  }
>;
export const NOTIFICATION_SOURCE_EVENT_TYPES = Object.keys(NOTIFICATION_EVENT_RULES) as [
  keyof typeof NOTIFICATION_EVENT_RULES,
  ...(keyof typeof NOTIFICATION_EVENT_RULES)[],
];

/** Resources that attention and resolution may reference (validated in the same account). */
export const notificationResourceTypeSchema = z.enum([
  "subscription",
  "file",
  "job",
  "branch",
  "machine",
]);
export const notificationResourceSchema = z
  .object({ type: notificationResourceTypeSchema, id: uuid })
  .strict();

export const notificationChannelSchema = z.enum(["in_app", "browser_push", "email"]);

/** API.md `Notification`, plus additive lifecycle timestamps and the linked resources. */
export const notificationSchema = z.object({
  id: uuid,
  type: z.string().min(1).max(100),
  priority: notificationPrioritySchema,
  title: z.string().min(1).max(250),
  message: z.string().min(1),
  recipientUserId: uuid,
  relatedResource: z.object({ type: z.string().min(1).max(60), id: uuid }).optional(),
  status: notificationStatusSchema,
  pinned: z.boolean(),
  sentChannels: z.array(notificationChannelSchema),
  escalationLevel: z.number().int().nonnegative(),
  action: z.object({ href: z.string().regex(/^\/[a-z0-9/_-]*$/u), label: z.string() }).optional(),
  occurredAt: timestamp,
  readAt: timestamp.nullable(),
  acknowledgedAt: timestamp.nullable(),
  inProgressAt: timestamp.nullable(),
  resolvedAt: timestamp.nullable(),
  attentionResource: notificationResourceSchema.nullable(),
  resolutionResource: notificationResourceSchema.nullable(),
  /** True while the linked condition is open: the alert cannot be resolved yet. */
  conditionOpen: z.boolean(),
  /** F5-12: latest email delivery for this recipient; null when the alert sends no email. */
  emailDelivery: notificationEmailDeliverySchema.nullable().default(null),
  audit: z.object({
    createdAt: timestamp,
    createdBy: uuid,
    updatedAt: timestamp,
    updatedBy: uuid,
    version: z.number().int().positive(),
  }),
});

/** Row projected by the API from `notification_recipients` + `notification_events`. */
export const notificationRecordSchema = z.object({
  id: uuid,
  type: z.string(),
  priority: internalNotificationPrioritySchema,
  title: z.string(),
  message: z.string(),
  recipientUserId: uuid,
  sourceType: z.string(),
  sourceId: uuid,
  status: internalNotificationStatusSchema,
  action: z.object({ href: z.string(), label: z.string() }).nullable(),
  occurredAt: timestamp,
  readAt: timestamp.nullable(),
  acknowledgedAt: timestamp.nullable(),
  inProgressAt: timestamp.nullable(),
  resolvedAt: timestamp.nullable(),
  attentionResource: notificationResourceSchema.nullable(),
  resolutionResource: notificationResourceSchema.nullable(),
  conditionOpen: z.boolean(),
  channels: z.array(z.string()),
  emailDelivery: z
    .object({ status: internalEmailDeliveryStatusSchema, updatedAt: timestamp })
    .nullable()
    .optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
  updatedBy: uuid.nullable(),
  rowVersion: z.number().int().positive(),
});
const SOURCE_RESOURCE_TYPES: Record<string, string> = {
  Subscription: "subscription",
  FileObject: "file",
};

/** Stored record → API.md `Notification` (public enums, pinned flag and audit fields). */
export function toPublicNotification(value: unknown): z.infer<typeof notificationSchema> {
  const row = notificationRecordSchema.parse(value);
  return notificationSchema.parse({
    id: row.id,
    type: row.type,
    priority: toPublicNotificationPriority(row.priority),
    title: row.title,
    message: row.message,
    recipientUserId: row.recipientUserId,
    relatedResource: {
      type: SOURCE_RESOURCE_TYPES[row.sourceType] ?? row.sourceType,
      id: row.sourceId,
    },
    status: toPublicNotificationStatus(row.status),
    // RF-ALT-006: critical alerts stay pinned until the recipient acknowledges them.
    pinned: row.priority === "CRITICAL" && row.acknowledgedAt === null && row.status !== "RESOLVED",
    sentChannels: row.channels,
    escalationLevel: 0,
    ...(row.action ? { action: row.action } : {}),
    occurredAt: row.occurredAt,
    readAt: row.readAt,
    acknowledgedAt: row.acknowledgedAt,
    inProgressAt: row.inProgressAt,
    resolvedAt: row.resolvedAt,
    attentionResource: row.attentionResource,
    resolutionResource: row.resolutionResource,
    conditionOpen: row.conditionOpen,
    emailDelivery: row.emailDelivery
      ? {
          status: toPublicEmailDeliveryStatus(row.emailDelivery.status),
          updatedAt: row.emailDelivery.updatedAt,
        }
      : null,
    audit: {
      createdAt: row.createdAt,
      createdBy: SYSTEM_ACTOR_ID,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy ?? SYSTEM_ACTOR_ID,
      version: row.rowVersion,
    },
  });
}

const flag = z.enum(["true", "false"]).transform((value) => value === "true");
/** NOT-001 filters: status, priority, type and cursor; `pinned` and `unacknowledged` are additive. */
export const notificationQuerySchema = cursorPageRequestSchema
  .extend({
    status: notificationStatusSchema.optional(),
    priority: notificationPrioritySchema.optional(),
    type: z
      .string()
      .regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/u)
      .max(100)
      .optional(),
    pinned: flag.optional(),
    unacknowledged: flag.optional(),
  })
  .strict();
export const notificationCursorSchema = z.tuple([z.iso.datetime({ precision: 6 }), uuid]);
export const notificationPageSchema = createCursorPageSchema(notificationSchema);

/** Badge and group counters for the active account (additive to API.md). */
export const notificationSummarySchema = z.object({
  badge: z.number().int().nonnegative(),
  unread: z.number().int().nonnegative(),
  pinned: z.number().int().nonnegative(),
  acknowledged: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});

/** NOT-003 to NOT-006 bodies. Client timestamps are accepted but the server time is recorded. */
export const markNotificationReadSchema = z.object({ readAt: timestamp.optional() }).strict();
export const acknowledgeNotificationSchema = z
  .object({ acknowledgedAt: timestamp.optional() })
  .strict();
export const startNotificationAttentionSchema = z
  .object({ relatedResource: notificationResourceSchema })
  .strict();
export const resolveNotificationSchema = z
  .object({ resolutionResource: notificationResourceSchema })
  .strict();
export const notificationActionSchema = z.enum([
  "read",
  "acknowledge",
  "start-attention",
  "resolve",
]);

export const notificationsOpenApi = {
  notification: z.toJSONSchema(notificationSchema),
  page: z.toJSONSchema(notificationPageSchema),
  query: z.toJSONSchema(notificationQuerySchema, { io: "input" }),
  summary: z.toJSONSchema(notificationSummarySchema),
  read: z.toJSONSchema(markNotificationReadSchema),
  acknowledge: z.toJSONSchema(acknowledgeNotificationSchema),
  startAttention: z.toJSONSchema(startNotificationAttentionSchema),
  resolve: z.toJSONSchema(resolveNotificationSchema),
};

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;
export type InternalNotificationStatus = z.infer<typeof internalNotificationStatusSchema>;
export type NotificationPriority = z.infer<typeof notificationPrioritySchema>;
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
export type NotificationPage = z.infer<typeof notificationPageSchema>;
export type NotificationSummary = z.infer<typeof notificationSummarySchema>;
export type NotificationResource = z.infer<typeof notificationResourceSchema>;
export type NotificationAction = z.infer<typeof notificationActionSchema>;
