import { z } from "zod";

const uuid = z.string().uuid();
const timestamp = z.iso.datetime({ offset: true });

/**
 * F5-13 scheduler. A task name is part of the idempotency key of every window it runs
 * (`infra.scheduler_windows`): never rename a task that already ran.
 */
export const scheduledTaskNameSchema = z
  .string()
  .max(80)
  .regex(/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/u, "dotted kebab-case, e.g. module.task");

/** Explicit IANA zone; the server zone is never used (PROJECT_RULES 24.2). */
export const ianaTimeZoneSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((zone) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: zone });
      return zone !== "local";
    } catch {
      return false;
    }
  }, "Unknown IANA time zone");

/** Five-field cron (minute hour day-of-month month day-of-week) or a fixed interval. */
export const taskScheduleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("cron"), expression: z.string().min(9).max(120) }).strict(),
  z
    .object({
      kind: z.literal("interval"),
      // At least one minute and at most one day; intervals align to the Unix epoch.
      everySeconds: z.number().int().min(60).max(86_400),
    })
    .strict(),
]);

/** Queue message of `scheduled_tasks`; one per window, sent by `infra.scheduler_enqueue`. */
export const SCHEDULED_TASK_MESSAGE_VERSION = 1;
export const scheduledTaskMessageSchema = z
  .object({
    messageVersion: z.literal(SCHEDULED_TASK_MESSAGE_VERSION),
    jobId: uuid,
    windowId: uuid,
    task: scheduledTaskNameSchema,
    windowStart: timestamp,
    windowEnd: timestamp,
    timeZone: ianaTimeZoneSchema,
    correlationId: uuid,
  })
  .strict();

/** Window states (`infra.scheduler_windows.status`). */
export const scheduledWindowStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "RETRY_WAIT",
  "FAILED",
  "SUCCEEDED",
]);

export const schedulerTickSummarySchema = z.object({
  tasks: z.number().int().nonnegative(),
  enqueued: z.number().int().nonnegative(),
  existing: z.number().int().nonnegative(),
  paused: z.number().int().nonnegative(),
  /** Missed windows that were not run because they exceed the task catch-up limit. */
  skipped: z.number().int().nonnegative(),
});

export const scheduledTaskBatchSummarySchema = z.object({
  received: z.number().int().nonnegative(),
  succeeded: z.number().int().nonnegative(),
  /** Window already completed by another delivery: acknowledged without running again. */
  duplicates: z.number().int().nonnegative(),
  /** Another worker holds a valid lease on the window. */
  busy: z.number().int().nonnegative(),
  /** The lease expired while running and another worker took the window over. */
  leaseLost: z.number().int().nonnegative(),
  retried: z.number().int().nonnegative(),
  deadLettered: z.number().int().nonnegative(),
});

/** RF-RPT-003 frequencies. The event closes a period; it does not choose reports or recipients. */
export const reportFrequencySchema = z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]);
export const REPORT_PERIOD_CLOSED_EVENT = "ReportPeriodClosed";
export const reportPeriodClosedPayloadSchema = z
  .object({
    frequency: reportFrequencySchema,
    periodStart: timestamp,
    periodEnd: timestamp,
    timeZone: ianaTimeZoneSchema,
    task: scheduledTaskNameSchema,
  })
  .strict();

/** Stripe reconciliation only records differences; nothing is corrected automatically. */
export const reconciliationFindingKindSchema = z.enum([
  "REMOTE_NOT_FOUND",
  "OWNERSHIP_MISMATCH",
  "STATUS_MISMATCH",
  "PERIOD_MISMATCH",
  "CANCELLATION_MISMATCH",
  "PRICE_MISMATCH",
]);

export type ScheduledTaskName = z.infer<typeof scheduledTaskNameSchema>;
export type TaskSchedule = z.infer<typeof taskScheduleSchema>;
export type ScheduledTaskMessage = z.infer<typeof scheduledTaskMessageSchema>;
export type ScheduledWindowStatus = z.infer<typeof scheduledWindowStatusSchema>;
export type SchedulerTickSummary = z.infer<typeof schedulerTickSummarySchema>;
export type ScheduledTaskBatchSummary = z.infer<typeof scheduledTaskBatchSummarySchema>;
export type ReportFrequency = z.infer<typeof reportFrequencySchema>;
export type ReportPeriodClosedPayload = z.infer<typeof reportPeriodClosedPayloadSchema>;
export type ReconciliationFindingKind = z.infer<typeof reconciliationFindingKindSchema>;
