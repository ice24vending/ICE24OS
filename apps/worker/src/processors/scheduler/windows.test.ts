import { describe, expect, it } from "vitest";
import {
  ScheduleError,
  dueWindows,
  latestFire,
  parseCron,
  validateSchedule,
  windowClosingBy,
  zonedInstant,
} from "./windows.js";

const at = (iso: string) => new Date(iso);
const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

describe("scheduler windows and time zones (F5-13)", () => {
  it("parses five-field cron with lists, ranges and steps", () => {
    const cron = parseCron("*/15 6-8 1,15 * 1-5");
    expect([...cron.minutes.values]).toEqual([0, 15, 30, 45]);
    expect([...cron.hours.values]).toEqual([6, 7, 8]);
    expect([...cron.days.values]).toEqual([1, 15]);
    expect(cron.months.values.size).toBe(12);
    expect(cron.weekdays.restricted).toBe(true);
    expect(parseCron("0 0 * * 7").weekdays.values.has(0)).toBe(true);
    for (const invalid of [
      "* * * *",
      "60 * * * *",
      "* 24 * * *",
      "5-1 * * * *",
      "a * * * *",
      "*/0 * * * *",
    ])
      expect(() => parseCron(invalid), invalid).toThrow(ScheduleError);
  });

  it("computes local midnight in an explicit zone, independent of the server zone", () => {
    // Mexico City has no DST since 2022: midnight is 06:00 UTC.
    expect(
      iso(
        zonedInstant({ year: 2026, month: 10, day: 5, hour: 0, minute: 0 }, "America/Mexico_City"),
      ),
    ).toBe("2026-10-05T06:00:00.000Z");
    expect(
      iso(zonedInstant({ year: 2026, month: 10, day: 5, hour: 0, minute: 0 }, "Asia/Tokyo")),
    ).toBe("2026-10-04T15:00:00.000Z");
  });

  it("skips non-existent local times and takes the first of repeated ones (DST)", () => {
    // New York: 2026-03-08 02:30 does not exist; 2026-11-01 01:30 happens twice.
    expect(
      zonedInstant({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, "America/New_York"),
    ).toBeNull();
    expect(
      iso(zonedInstant({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, "America/New_York")),
    ).toBe("2026-11-01T05:30:00.000Z");
    // A daily 02:30 job fires on the next valid day instead of inventing an instant.
    const cron = parseCron("30 2 * * *");
    expect(iso(latestFire(cron, "America/New_York", Date.parse("2026-03-08T12:00:00Z")))).toBe(
      "2026-03-07T07:30:00.000Z",
    );
  });

  it("closes weekly and monthly report periods at local midnight", () => {
    const weekly = windowClosingBy(
      { kind: "cron", expression: "0 0 * * 1" },
      "America/Mexico_City",
      Date.parse("2026-10-07T12:00:00Z"),
    );
    expect(weekly).toEqual({
      start: at("2026-09-28T06:00:00.000Z"),
      end: at("2026-10-05T06:00:00.000Z"),
      key: "2026-10-05T06:00:00.000Z",
    });
    // Monday 00:30 local is already after the 00:00 fire; 05:59 UTC is still Sunday locally.
    expect(
      windowClosingBy(
        { kind: "cron", expression: "0 0 * * 1" },
        "America/Mexico_City",
        Date.parse("2026-10-05T05:59:00Z"),
      )?.key,
    ).toBe("2026-09-28T06:00:00.000Z");
    const monthly = windowClosingBy(
      { kind: "cron", expression: "0 0 1 * *" },
      "America/Mexico_City",
      Date.parse("2026-10-05T12:00:00Z"),
    );
    expect([monthly?.start.toISOString(), monthly?.end.toISOString()]).toEqual([
      "2026-09-01T06:00:00.000Z",
      "2026-10-01T06:00:00.000Z",
    ]);
    const quarterly = windowClosingBy(
      { kind: "cron", expression: "0 0 1 1,4,7,10 *" },
      "America/Mexico_City",
      Date.parse("2026-10-05T12:00:00Z"),
    );
    expect(quarterly?.start.toISOString()).toBe("2026-07-01T06:00:00.000Z");
  });

  it("aligns interval windows to the epoch", () => {
    const window = windowClosingBy(
      { kind: "interval", everySeconds: 300 },
      "UTC",
      Date.parse("2026-10-05T10:07:12Z"),
    );
    expect([window?.start.toISOString(), window?.end.toISOString()]).toEqual([
      "2026-10-05T10:00:00.000Z",
      "2026-10-05T10:05:00.000Z",
    ]);
  });

  it("starts from the latest window without backfill and is idempotent per window", () => {
    const schedule = { kind: "interval", everySeconds: 300 } as const;
    const now = at("2026-10-05T10:07:12Z");
    const first = dueWindows(schedule, "UTC", now, null, 3);
    expect(first.windows.map((w) => w.key)).toEqual(["2026-10-05T10:05:00.000Z"]);
    expect(first.skipped).toBe(0);
    // Same window already recorded: nothing due until the next one closes.
    expect(dueWindows(schedule, "UTC", now, first.windows[0]!.end, 3)).toEqual({
      windows: [],
      skipped: 0,
    });
  });

  it("runs the most recent missed windows up to the catch-up limit and counts the rest", () => {
    const interval = dueWindows(
      { kind: "interval", everySeconds: 300 },
      "UTC",
      at("2026-10-05T11:02:00Z"),
      at("2026-10-05T10:05:00Z"),
      2,
    );
    expect(interval.windows.map((w) => w.key)).toEqual([
      "2026-10-05T10:55:00.000Z",
      "2026-10-05T11:00:00.000Z",
    ]);
    expect(interval.skipped).toBe(9);
    const weekly = dueWindows(
      { kind: "cron", expression: "0 0 * * 1" },
      "America/Mexico_City",
      at("2026-10-07T12:00:00Z"),
      at("2026-09-07T06:00:00Z"),
      2,
    );
    expect(weekly.windows.map((w) => w.key)).toEqual([
      "2026-09-28T06:00:00.000Z",
      "2026-10-05T06:00:00.000Z",
    ]);
    expect(weekly.skipped).toBe(2);
  });

  it("rejects unknown zones and invalid catch-up limits", () => {
    expect(() => validateSchedule({ kind: "interval", everySeconds: 300 }, "Mars/Base")).toThrow(
      ScheduleError,
    );
    expect(() => validateSchedule({ kind: "interval", everySeconds: 300 }, "local")).toThrow(
      ScheduleError,
    );
    expect(() => validateSchedule({ kind: "cron", expression: "0 0 31 2 *" }, "UTC")).toThrow(
      ScheduleError,
    );
    expect(() =>
      dueWindows({ kind: "interval", everySeconds: 300 }, "UTC", new Date(), null, 0),
    ).toThrow(ScheduleError);
  });
});
