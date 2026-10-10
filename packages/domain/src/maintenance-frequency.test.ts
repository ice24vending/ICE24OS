import { describe, expect, it } from "vitest";

import {
  addFrequency,
  DomainError,
  resolveEffectiveFrequency,
  sameFrequency,
  subtractFrequency,
  type FactoryFrequency,
  type FrequencyOverride,
} from "./index.js";

const at = new Date("2026-10-11T12:00:00.000Z");
const before = new Date("2026-10-01T00:00:00.000Z");
const later = new Date("2026-10-20T00:00:00.000Z");
const template: FactoryFrequency = {
  frequency: { value: 7, unit: "days" },
  alertLead: { value: 2, unit: "days" },
};
const override = (
  value: number,
  unit: "days" | "weeks" | "months",
  options: Partial<FrequencyOverride> = {},
): FrequencyOverride => ({
  frequency: { value, unit },
  alertLead: null,
  validFrom: before,
  validTo: null,
  ...options,
});

describe("TASK-F4-20 resolveEffectiveFrequency", () => {
  it("uses exactly the template values when the client defines nothing", () => {
    expect(resolveEffectiveFrequency(template, [], [], at)).toEqual({
      value: 7,
      unit: "days",
      alertLead: { value: 2, unit: "days" },
      source: "TEMPLATE",
      alertSource: "TEMPLATE",
      factoryValue: { value: 7, unit: "days" },
      factoryAlertLead: { value: 2, unit: "days" },
    });
  });

  it("uses the account override when only the account defines one", () => {
    const result = resolveEffectiveFrequency(template, [override(2, "weeks")], [], at);
    expect(result).toMatchObject({ value: 2, unit: "weeks", source: "ACCOUNT" });
    expect(result.factoryValue).toEqual({ value: 7, unit: "days" });
  });

  it("uses the machine override when only the machine defines one", () => {
    expect(resolveEffectiveFrequency(template, [], [override(10, "days")], at)).toMatchObject({
      value: 10,
      unit: "days",
      source: "MACHINE",
    });
  });

  it("prefers the machine over the account and keeps the factory value", () => {
    const result = resolveEffectiveFrequency(
      template,
      [override(1, "months")],
      [override(3, "days")],
      at,
    );
    expect(result).toMatchObject({ value: 3, unit: "days", source: "MACHINE" });
    expect(result.factoryValue).toEqual(template.frequency);
  });

  it("ignores closed and future overrides", () => {
    const closed = override(1, "days", { validTo: at });
    const future = override(2, "days", { validFrom: later });
    expect(resolveEffectiveFrequency(template, [closed], [future], at).source).toBe("TEMPLATE");
    const reopened = override(5, "days", { validFrom: at });
    expect(resolveEffectiveFrequency(template, [closed, reopened], [], at)).toMatchObject({
      value: 5,
      source: "ACCOUNT",
    });
    // Before the account closed it, the old value applied.
    expect(resolveEffectiveFrequency(template, [closed, reopened], [], before)).toMatchObject({
      value: 1,
      source: "ACCOUNT",
    });
  });

  it("keeps each level's unit as written", () => {
    for (const unit of ["days", "weeks", "months"] as const)
      expect(resolveEffectiveFrequency(template, [], [override(4, unit)], at)).toMatchObject({
        value: 4,
        unit,
      });
  });

  it("inherits the alert lead from the next level that defines one", () => {
    const accountAlert = override(14, "days", { alertLead: { value: 1, unit: "weeks" } });
    expect(
      resolveEffectiveFrequency(template, [accountAlert], [override(3, "days")], at),
    ).toMatchObject({
      value: 3,
      source: "MACHINE",
      alertLead: { value: 1, unit: "weeks" },
      alertSource: "ACCOUNT",
    });
    expect(
      resolveEffectiveFrequency({ ...template, alertLead: null }, [], [override(3, "days")], at),
    ).toMatchObject({ alertLead: null, alertSource: null, factoryAlertLead: null });
  });

  it("allows any positive value (RA-01-D1) and rejects invalid ones", () => {
    expect(resolveEffectiveFrequency(template, [], [override(1, "days")], at).value).toBe(1);
    expect(resolveEffectiveFrequency(template, [], [override(120, "months")], at).value).toBe(120);
    for (const invalid of [override(0, "days"), override(-1, "weeks"), override(1.5, "days")])
      expect(() => resolveEffectiveFrequency(template, [], [invalid], at)).toThrow(DomainError);
    expect(() =>
      resolveEffectiveFrequency(template, [], [override(1, "years" as "days")], at),
    ).toThrow(DomainError);
  });
});

describe("TASK-F4-20 sameFrequency", () => {
  it("treats weeks as seven days and months only as months", () => {
    expect(sameFrequency({ value: 1, unit: "weeks" }, { value: 7, unit: "days" })).toBe(true);
    expect(sameFrequency({ value: 2, unit: "weeks" }, { value: 7, unit: "days" })).toBe(false);
    expect(sameFrequency({ value: 1, unit: "months" }, { value: 30, unit: "days" })).toBe(false);
    expect(sameFrequency({ value: 3, unit: "months" }, { value: 3, unit: "months" })).toBe(true);
  });
});

describe("TASK-F4-21 frequency arithmetic", () => {
  const start = new Date("2026-01-31T15:00:00.000Z");
  it("adds days and weeks as exact 24 h multiples", () => {
    expect(addFrequency(start, { value: 7, unit: "days" }).toISOString()).toBe(
      "2026-02-07T15:00:00.000Z",
    );
    expect(addFrequency(start, { value: 2, unit: "weeks" }).toISOString()).toBe(
      "2026-02-14T15:00:00.000Z",
    );
  });
  it("adds calendar months clamping to the last day", () => {
    expect(addFrequency(start, { value: 1, unit: "months" }).toISOString()).toBe(
      "2026-02-28T15:00:00.000Z",
    );
    expect(addFrequency(start, { value: 13, unit: "months" }).toISOString()).toBe(
      "2027-02-28T15:00:00.000Z",
    );
    expect(
      addFrequency(new Date("2027-12-31T00:00:00.000Z"), {
        value: 2,
        unit: "months",
      }).toISOString(),
    ).toBe("2028-02-29T00:00:00.000Z");
  });
  it("subtracts alert leads with the same rules and rejects invalid ones", () => {
    expect(
      subtractFrequency(new Date("2026-03-31T00:00:00.000Z"), {
        value: 1,
        unit: "months",
      }).toISOString(),
    ).toBe("2026-02-28T00:00:00.000Z");
    expect(subtractFrequency(start, { value: 3, unit: "days" }).toISOString()).toBe(
      "2026-01-28T15:00:00.000Z",
    );
    expect(() => addFrequency(start, { value: 0, unit: "days" })).toThrow(DomainError);
  });
});
