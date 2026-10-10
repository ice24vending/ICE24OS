import { DomainError } from "./index.js";

// TASK-F4-20 (RA-01, RF-TPL-015): effective maintenance and sanitation frequencies.

export const FREQUENCY_UNITS = ["days", "weeks", "months"] as const;
export type FrequencyUnit = (typeof FREQUENCY_UNITS)[number];
export type FrequencySource = "TEMPLATE" | "ACCOUNT" | "MACHINE";

export interface FrequencyDuration {
  value: number;
  unit: FrequencyUnit;
}

/** ICE24 template default (factory value) for one activity. */
export interface FactoryFrequency {
  frequency: FrequencyDuration;
  alertLead: FrequencyDuration | null;
}

/** One version of a client override; `validTo` null while it is open. */
export interface FrequencyOverride {
  frequency: FrequencyDuration;
  alertLead: FrequencyDuration | null;
  validFrom: Date;
  validTo: Date | null;
}

export interface EffectiveFrequency {
  value: number;
  unit: FrequencyUnit;
  alertLead: FrequencyDuration | null;
  source: FrequencySource;
  alertSource: FrequencySource | null;
  factoryValue: FrequencyDuration;
  factoryAlertLead: FrequencyDuration | null;
}

/** RA-01-D1: no minimum blocks the client; only a positive integer with a known unit. */
export function assertFrequency(duration: FrequencyDuration, field = "frequency"): void {
  if (!Number.isSafeInteger(duration.value) || duration.value < 1)
    throw new DomainError("INVALID_VALUE", `${field} must be a positive integer`);
  if (!FREQUENCY_UNITS.includes(duration.unit))
    throw new DomainError("INVALID_VALUE", `${field} has an unknown unit`);
}

/**
 * Same interval regardless of how it is written: weeks are exact days; months are calendar
 * months and only equal other months.
 */
export function sameFrequency(left: FrequencyDuration, right: FrequencyDuration): boolean {
  const days = (d: FrequencyDuration) => (d.unit === "weeks" ? d.value * 7 : d.value);
  if ((left.unit === "months") !== (right.unit === "months")) return false;
  return days(left) === days(right);
}

function activeAt(overrides: readonly FrequencyOverride[], at: Date): FrequencyOverride | null {
  let chosen: FrequencyOverride | null = null;
  for (const override of overrides) {
    const time = at.getTime();
    if (override.validFrom.getTime() > time) continue;
    if (override.validTo !== null && override.validTo.getTime() <= time) continue;
    // The database forbids overlaps; the latest start wins if a caller passes them anyway.
    if (!chosen || override.validFrom.getTime() > chosen.validFrom.getTime()) chosen = override;
  }
  return chosen;
}

/**
 * Priority machine → account → template. The alert lead follows the same priority but an
 * override without one inherits it from the next level. The factory value is always returned
 * so warranty review can compare it with the client's value.
 */
export function resolveEffectiveFrequency(
  template: FactoryFrequency,
  accountOverrides: readonly FrequencyOverride[],
  machineOverrides: readonly FrequencyOverride[],
  at: Date = new Date(),
): EffectiveFrequency {
  assertFrequency(template.frequency, "template frequency");
  if (template.alertLead) assertFrequency(template.alertLead, "template alert lead");
  const levels: { source: FrequencySource; values: FactoryFrequency }[] = [];
  const machine = activeAt(machineOverrides, at);
  if (machine) levels.push({ source: "MACHINE", values: machine });
  const account = activeAt(accountOverrides, at);
  if (account) levels.push({ source: "ACCOUNT", values: account });
  levels.push({ source: "TEMPLATE", values: template });
  for (const level of levels) {
    assertFrequency(level.values.frequency);
    if (level.values.alertLead) assertFrequency(level.values.alertLead, "alert lead");
  }
  const chosen = levels[0]!;
  const alert = levels.find((level) => level.values.alertLead !== null);
  return {
    value: chosen.values.frequency.value,
    unit: chosen.values.frequency.unit,
    alertLead: alert?.values.alertLead ?? null,
    source: chosen.source,
    alertSource: alert?.source ?? null,
    factoryValue: template.frequency,
    factoryAlertLead: template.alertLead,
  };
}

function shift(instant: Date, duration: FrequencyDuration, sign: 1 | -1): Date {
  assertFrequency(duration);
  if (duration.unit !== "months") {
    const days = duration.unit === "weeks" ? duration.value * 7 : duration.value;
    return new Date(instant.getTime() + sign * days * 86_400_000);
  }
  const result = new Date(instant.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + sign * duration.value);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/**
 * Adds an interval to an instant (F4-21). Days and weeks are exact multiples of 24 h in UTC;
 * months are calendar months in UTC and clamp to the last day (31 Jan + 1 month = 28/29 Feb).
 */
export const addFrequency = (instant: Date, duration: FrequencyDuration): Date =>
  shift(instant, duration, 1);

/** Alert instant before a due date, with the same calendar rules. */
export const subtractFrequency = (instant: Date, duration: FrequencyDuration): Date =>
  shift(instant, duration, -1);
