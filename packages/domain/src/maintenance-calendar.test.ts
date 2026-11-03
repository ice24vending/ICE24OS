import { describe, expect, it } from "vitest";
import { shiftLocalFrequency } from "./maintenance-calendar.js";

describe("F7 local calendar", () => {
  it.each([
    ["America/Mexico_City", "2026-03-07T16:00:00Z", "2026-03-08T16:00:00.000Z"],
    ["America/New_York", "2026-03-07T15:00:00Z", "2026-03-08T14:00:00.000Z"],
    ["America/New_York", "2026-10-31T14:00:00Z", "2026-11-01T15:00:00.000Z"],
    ["Asia/Kolkata", "2026-03-07T04:30:00Z", "2026-03-08T04:30:00.000Z"],
  ])("preserves local hour in %s", (zone, start, expected) => {
    expect(
      shiftLocalFrequency(new Date(start), { value: 1, unit: "days" }, zone).toISOString(),
    ).toBe(expected);
  });
  it("uses first valid minute in a gap and earliest instant in an overlap", () => {
    expect(
      shiftLocalFrequency(
        new Date("2026-03-07T07:30:00Z"),
        { value: 1, unit: "days" },
        "America/New_York",
      ).toISOString(),
    ).toBe("2026-03-08T07:00:00.000Z");
    expect(
      shiftLocalFrequency(
        new Date("2026-10-31T05:30:00Z"),
        { value: 1, unit: "days" },
        "America/New_York",
      ).toISOString(),
    ).toBe("2026-11-01T05:30:00.000Z");
  });
  it("clamps months and subtracts the local alert window", () => {
    expect(
      shiftLocalFrequency(
        new Date("2026-01-31T16:00:00Z"),
        { value: 1, unit: "months" },
        "America/Mexico_City",
      ).toISOString(),
    ).toBe("2026-02-28T16:00:00.000Z");
    expect(
      shiftLocalFrequency(
        new Date("2026-03-09T14:00:00Z"),
        { value: 2, unit: "days" },
        "America/New_York",
        -1,
      ).toISOString(),
    ).toBe("2026-03-07T15:00:00.000Z");
  });
});
