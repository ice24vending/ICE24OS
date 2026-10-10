import { describe, expect, it } from "vitest";
import { errorCodeSchema } from "./errors.js";
import {
  effectiveFrequencySchema,
  resetFrequencyOverridesSchema,
  setFrequencyOverrideSchema,
} from "./equipment.js";

const reason = "Frecuencia ajustada por calidad del agua";
const base = {
  activityCode: "CLEAN",
  componentCatalogId: null,
  frequency: { value: 10, unit: "days" },
  alertLead: null,
  reason,
  confirmation: true,
};

describe("TASK-F4-20 frequency override contracts", () => {
  it("accepts any positive frequency with a valid unit (RA-01-D1: no blocking minimum)", () => {
    for (const frequency of [
      { value: 1, unit: "days" },
      { value: 52, unit: "weeks" },
      { value: 120, unit: "months" },
    ])
      expect(setFrequencyOverrideSchema.safeParse({ ...base, frequency }).success).toBe(true);
    for (const frequency of [
      { value: 0, unit: "days" },
      { value: -3, unit: "weeks" },
      { value: 1.5, unit: "days" },
      { value: 1, unit: "years" },
    ])
      expect(setFrequencyOverrideSchema.safeParse({ ...base, frequency }).success).toBe(false);
  });
  it("only accepts an explicit true warranty acknowledgement and never server fields", () => {
    expect(
      setFrequencyOverrideSchema.safeParse({ ...base, warrantyWarningAcknowledged: true }).success,
    ).toBe(true);
    expect(
      setFrequencyOverrideSchema.safeParse({ ...base, warrantyWarningAcknowledged: false }).success,
    ).toBe(false);
    for (const field of ["scope", "machineId", "accountId", "version", "source"])
      expect(setFrequencyOverrideSchema.safeParse({ ...base, [field]: "MACHINE" }).success).toBe(
        false,
      );
    expect(
      setFrequencyOverrideSchema.safeParse({ ...base, alertLead: { value: 2, unit: "days" } })
        .success,
    ).toBe(true);
  });
  it("restores factory values for everything or for one component or activity", () => {
    expect(resetFrequencyOverridesSchema.safeParse({ reason, confirmation: true }).success).toBe(
      true,
    );
    expect(
      resetFrequencyOverridesSchema.safeParse({
        reason,
        confirmation: true,
        componentCatalogId: "0192e8e8-45ad-7b12-8d90-73db122e70e1",
      }).success,
    ).toBe(true);
    expect(resetFrequencyOverridesSchema.safeParse({ reason, confirmation: false }).success).toBe(
      false,
    );
  });
  it("documents the warranty error code and always exposes the factory value", () => {
    expect(errorCodeSchema.safeParse("WARRANTY_WARNING_CONFIRMATION_REQUIRED").success).toBe(true);
    const item = {
      activityCode: "CLEAN",
      componentCatalogId: null,
      activityName: "Limpieza",
      activityType: "SANITATION",
      frequency: { value: 10, unit: "days" },
      alertLead: null,
      source: "MACHINE",
      alertSource: null,
      factory: { frequency: { value: 7, unit: "days" }, alertLead: null },
      differsFromFactory: true,
      warrantyApplies: true,
      accountOverride: null,
      machineOverride: null,
    };
    expect(effectiveFrequencySchema.safeParse(item).success).toBe(true);
    const { factory: _factory, ...withoutFactory } = item;
    expect(effectiveFrequencySchema.safeParse(withoutFactory).success).toBe(false);
  });
});
