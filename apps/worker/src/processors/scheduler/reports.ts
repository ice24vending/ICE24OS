import type { ReportFrequency, TaskSchedule } from "@ice24/contracts";
import type { ScheduledTask } from "./engine.js";

/**
 * Platform default zone of identity (`identity.users.time_zone` default). Per-account zones for
 * report periods belong to report schedules (TASK-F10-09).
 */
export const REPORT_PERIOD_TIME_ZONE = "America/Mexico_City";

/** RF-RPT-003 frequencies; each period closes at local midnight of its first day. */
const PERIODS: readonly {
  frequency: ReportFrequency;
  name: string;
  schedule: TaskSchedule;
  catchUpWindows: number;
}[] = [
  {
    frequency: "WEEKLY",
    name: "reports.weekly-period",
    schedule: { kind: "cron", expression: "0 0 * * 1" },
    catchUpWindows: 4,
  },
  {
    frequency: "MONTHLY",
    name: "reports.monthly-period",
    schedule: { kind: "cron", expression: "0 0 1 * *" },
    catchUpWindows: 3,
  },
  {
    frequency: "QUARTERLY",
    name: "reports.quarterly-period",
    schedule: { kind: "cron", expression: "0 0 1 1,4,7,10 *" },
    catchUpWindows: 2,
  },
  {
    frequency: "YEARLY",
    name: "reports.yearly-period",
    schedule: { kind: "cron", expression: "0 0 1 1 *" },
    catchUpWindows: 1,
  },
];

/**
 * Publishes `ReportPeriodClosed` through the transactional outbox when a period closes. The
 * event id is the window id, so retries never publish it twice. This task does not choose
 * reports, accounts or recipients and does not send email: report schedules (TASK-F10-09)
 * consume the event and request delivery through `email.request` (F5-12), which only accepts
 * registered, authorized users (RF-RPT-004).
 */
export function reportPeriodTasks(): ScheduledTask[] {
  return PERIODS.map((period) => ({
    name: period.name,
    schedule: period.schedule,
    timeZone: REPORT_PERIOD_TIME_ZONE,
    catchUpWindows: period.catchUpWindows,
    async handle(context) {
      const result = await context.pool.query<{ published: boolean }>(
        "select infra.scheduler_emit_report_period($1,$2) as published",
        [context.windowId, period.frequency],
      );
      return { eventsPublished: result.rows[0]?.published === true ? 1 : 0 };
    },
  }));
}
