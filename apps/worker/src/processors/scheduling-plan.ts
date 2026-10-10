import {
  addFrequency,
  resolveEffectiveFrequency,
  subtractFrequency,
  type FrequencyDuration,
  type FrequencyOverride,
  type FrequencySource,
} from "@ice24/domain";

/**
 * TASK-F4-21 (RF-TPL-016): pure calendar plan of a machine. The plan depends only on the
 * machine's state (template, active components, effective frequencies and completed work), never
 * on the job or event that asked for it, so recalculations converge regardless of their order.
 */

export interface PlanTemplateActivity {
  readonly code: string;
  readonly triggerType: string;
  readonly frequencyDays: number | null;
  readonly [field: string]: unknown;
}

/** Activity of a client component active on the machine (RA-01-D3). */
export interface PlanComponentActivity {
  readonly componentCatalogId: string;
  /** Start of the open active configuration version (F4-19). */
  readonly activeSince: Date;
  readonly activity: {
    readonly code: string;
    readonly defaultFrequency: FrequencyDuration;
    readonly [field: string]: unknown;
  };
}

export interface PlanOverride extends FrequencyOverride {
  readonly scope: "ACCOUNT" | "MACHINE";
  readonly activityCode: string;
  readonly componentCatalogId: string | null;
}

export interface PlanInput {
  /** Start of the open template period of the machine. */
  readonly templateSince: Date;
  readonly templateActivities: readonly PlanTemplateActivity[];
  readonly componentActivities: readonly PlanComponentActivity[];
  /** Open overrides of the machine's account (ACCOUNT) and of the machine (MACHINE). */
  readonly overrides: readonly PlanOverride[];
  /** Latest due date of in-progress or completed work per plan key. */
  readonly lastDone: ReadonlyMap<string, Date>;
  /** Instant at which overrides are evaluated (they are open, so any current instant). */
  readonly at: Date;
}

/** Snapshot of the applied frequency stored in the activity definition. */
export interface ScheduleSnapshot {
  readonly frequency: FrequencyDuration;
  readonly source: FrequencySource;
  readonly factory: FrequencyDuration;
  readonly alertLead: FrequencyDuration | null;
  readonly alertSource: FrequencySource | null;
  readonly anchor: string;
}

export interface PlannedActivity {
  readonly key: string;
  readonly activityCode: string;
  readonly componentCatalogId: string | null;
  readonly definition: Record<string, unknown>;
  readonly dueAt: Date | null;
  readonly alertAt: Date | null;
}

export interface PendingActivity {
  readonly id: string;
  readonly activityCode: string;
  readonly componentCatalogId: string | null;
  readonly definition: unknown;
  readonly dueAt: Date | null;
  readonly alertAt: Date | null;
}

export const planKey = (activityCode: string, componentCatalogId: string | null): string =>
  `${componentCatalogId ?? "template"}:${activityCode}`;

const latest = (...dates: (Date | undefined)[]): Date =>
  new Date(Math.max(...dates.flatMap((d) => (d ? [d.getTime()] : []))));

function scheduled(
  input: PlanInput,
  activityCode: string,
  componentCatalogId: string | null,
  factory: FrequencyDuration,
  since: Date,
): { snapshot: ScheduleSnapshot; dueAt: Date; alertAt: Date | null } {
  const matches = (scope: PlanOverride["scope"]) =>
    input.overrides.filter(
      (o) =>
        o.scope === scope &&
        o.activityCode === activityCode &&
        o.componentCatalogId === componentCatalogId,
    );
  const effective = resolveEffectiveFrequency(
    { frequency: factory, alertLead: null },
    matches("ACCOUNT"),
    matches("MACHINE"),
    input.at,
  );
  // Next occurrence after the latest of: template start, component activation, last work done.
  const anchor = latest(since, input.lastDone.get(planKey(activityCode, componentCatalogId)));
  const frequency = { value: effective.value, unit: effective.unit };
  const dueAt = addFrequency(anchor, frequency);
  return {
    snapshot: {
      frequency,
      source: effective.source,
      factory: effective.factoryValue,
      alertLead: effective.alertLead,
      alertSource: effective.alertSource,
      anchor: anchor.toISOString(),
    },
    dueAt,
    alertAt: effective.alertLead ? subtractFrequency(dueAt, effective.alertLead) : null,
  };
}

export function planActivities(input: PlanInput): PlannedActivity[] {
  const planned: PlannedActivity[] = [];
  for (const activity of input.templateActivities) {
    const key = planKey(activity.code, null);
    // Usage, condition and event triggers have no due date, as in F4-13.
    if (activity.triggerType !== "time" || activity.frequencyDays === null) {
      planned.push({
        key,
        activityCode: activity.code,
        componentCatalogId: null,
        definition: { ...activity, schedule: null },
        dueAt: null,
        alertAt: null,
      });
      continue;
    }
    const result = scheduled(
      input,
      activity.code,
      null,
      { value: activity.frequencyDays, unit: "days" },
      input.templateSince,
    );
    planned.push({
      key,
      activityCode: activity.code,
      componentCatalogId: null,
      definition: { ...activity, schedule: result.snapshot },
      dueAt: result.dueAt,
      alertAt: result.alertAt,
    });
  }
  for (const component of input.componentActivities) {
    const code = component.activity.code;
    const result = scheduled(
      input,
      code,
      component.componentCatalogId,
      component.activity.defaultFrequency,
      latest(input.templateSince, component.activeSince),
    );
    planned.push({
      key: planKey(code, component.componentCatalogId),
      activityCode: code,
      componentCatalogId: component.componentCatalogId,
      definition: {
        ...component.activity,
        componentCatalogId: component.componentCatalogId,
        schedule: result.snapshot,
      },
      dueAt: result.dueAt,
      alertAt: result.alertAt,
    });
  }
  return planned;
}

/** JSON with sorted keys: jsonb does not keep key order. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

const sameTime = (a: Date | null, b: Date | null) =>
  a === null || b === null ? a === b : a.getTime() === b.getTime();

/**
 * Changes needed to move the future pending activities to the plan (RF-TPL-007): identical
 * activities are kept, the rest are cancelled and the missing ones inserted. Keys in `frozen`
 * (an overdue pending activity exists) are neither cancelled nor planned again.
 */
export function diffSchedule(
  planned: readonly PlannedActivity[],
  futurePending: readonly PendingActivity[],
  frozen: ReadonlySet<string>,
): { cancel: string[]; insert: PlannedActivity[] } {
  const remaining = [...futurePending];
  const insert: PlannedActivity[] = [];
  for (const activity of planned) {
    if (frozen.has(activity.key)) continue;
    const index = remaining.findIndex(
      (p) =>
        planKey(p.activityCode, p.componentCatalogId) === activity.key &&
        sameTime(p.dueAt, activity.dueAt) &&
        sameTime(p.alertAt, activity.alertAt) &&
        canonical(p.definition) === canonical(activity.definition),
    );
    if (index >= 0) remaining.splice(index, 1);
    else insert.push(activity);
  }
  return { cancel: remaining.map((p) => p.id), insert };
}
