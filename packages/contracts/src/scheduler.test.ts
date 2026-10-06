import { describe, expect, it } from "vitest";
import {
  ianaTimeZoneSchema,
  reportPeriodClosedPayloadSchema,
  scheduledTaskMessageSchema,
  scheduledTaskNameSchema,
  taskScheduleSchema,
} from "./scheduler.js";

describe("scheduler contracts (F5-13)", () => {
  it("accepts dotted kebab-case task names only", () => {
    expect(scheduledTaskNameSchema.safeParse("subscriptions.expirations").success).toBe(true);
    expect(scheduledTaskNameSchema.safeParse("reports.weekly-period").success).toBe(true);
    for (const invalid of ["expirations", "Subscriptions.x", "a..b", "a.b c", "a.".padEnd(90, "x")])
      expect(scheduledTaskNameSchema.safeParse(invalid).success).toBe(false);
  });

  it("requires an explicit IANA zone and never the server zone", () => {
    expect(ianaTimeZoneSchema.safeParse("America/Mexico_City").success).toBe(true);
    expect(ianaTimeZoneSchema.safeParse("UTC").success).toBe(true);
    expect(ianaTimeZoneSchema.safeParse("local").success).toBe(false);
    expect(ianaTimeZoneSchema.safeParse("Mars/Olympus_Mons").success).toBe(false);
    expect(ianaTimeZoneSchema.safeParse("").success).toBe(false);
  });

  it("bounds interval schedules and distinguishes cron schedules", () => {
    expect(taskScheduleSchema.safeParse({ kind: "interval", everySeconds: 300 }).success).toBe(
      true,
    );
    expect(taskScheduleSchema.safeParse({ kind: "interval", everySeconds: 30 }).success).toBe(
      false,
    );
    expect(taskScheduleSchema.safeParse({ kind: "cron", expression: "0 0 * * 1" }).success).toBe(
      true,
    );
    expect(taskScheduleSchema.safeParse({ kind: "cron", everySeconds: 300 }).success).toBe(false);
  });

  it("validates queue messages strictly", () => {
    const message = {
      messageVersion: 1,
      jobId: "5b0e5d0c-7c45-4b0a-9a53-0d0b8f0f4a11",
      windowId: "8f4c6a7e-2a43-4b8b-9a9e-6f3c0b8d2e10",
      task: "subscriptions.expirations",
      windowStart: "2026-10-05T10:00:00.000Z",
      windowEnd: "2026-10-05T10:05:00.000Z",
      timeZone: "UTC",
      correlationId: "0a7d1c4e-5f9b-4e2a-8c3d-1b2a3c4d5e6f",
    };
    expect(scheduledTaskMessageSchema.safeParse(message).success).toBe(true);
    expect(scheduledTaskMessageSchema.safeParse({ ...message, payload: {} }).success).toBe(false);
    expect(scheduledTaskMessageSchema.safeParse({ ...message, messageVersion: 2 }).success).toBe(
      false,
    );
  });

  it("describes a closed report period without recipients or report choice", () => {
    const payload = {
      frequency: "MONTHLY",
      periodStart: "2026-09-01T06:00:00.000Z",
      periodEnd: "2026-10-01T06:00:00.000Z",
      timeZone: "America/Mexico_City",
      task: "reports.monthly-period",
    };
    expect(reportPeriodClosedPayloadSchema.safeParse(payload).success).toBe(true);
    expect(
      reportPeriodClosedPayloadSchema.safeParse({ ...payload, recipients: ["x"] }).success,
    ).toBe(false);
  });
});
