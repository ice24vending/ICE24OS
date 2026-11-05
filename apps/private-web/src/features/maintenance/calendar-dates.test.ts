import { describe, expect, it } from "vitest";
import { activityDay, calendarDays, moveDay, movePeriod } from "./calendar-dates";
import type { ScheduledActivity } from "@ice24/contracts";
describe("maintenance calendar dates", () => {
  it("keeps a complete Monday-first month across year boundaries", () => {
    const days = calendarDays("2027-01-01", "month");
    expect(days).toHaveLength(42);
    expect(days[0]).toBe("2026-12-28");
    expect(days.at(-1)).toBe("2027-02-07");
    expect(new Set(days).size).toBe(42);
  });
  it("moves calendar months without overflowing short months", () => {
    expect(movePeriod("2028-01-31", "month", 1)).toBe("2028-02-01");
    expect(moveDay("2028-02-28", 1)).toBe("2028-02-29");
    expect(movePeriod("2026-12-31", "day", 1)).toBe("2027-01-01");
    expect(movePeriod("2026-11-03", "week", -1)).toBe("2026-10-27");
  });
  it("provides week and day views without losing boundary dates", () => {
    expect(calendarDays("2026-11-01", "week")).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
    expect(calendarDays("2026-11-01", "day")).toEqual(["2026-11-01"]);
  });
  it("groups by the branch date, not the browser or UTC date", () => {
    const row = {
      dueAt: "2026-11-03T02:00:00Z",
      timezone: "America/Mexico_City",
    } as ScheduledActivity;
    expect(activityDay(row)).toBe("2026-11-02");
    expect(activityDay({ ...row, timezone: "Asia/Tokyo" })).toBe("2026-11-03");
    expect(activityDay({ ...row, dueAt: null })).toBeNull();
  });
});
