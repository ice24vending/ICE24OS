import { describe, expect, it } from "vitest";
import {
  canonical,
  diffSchedule,
  planActivities,
  planKey,
  type PendingActivity,
  type PlanInput,
  type PlannedActivity,
} from "./scheduling-plan.js";

const since = new Date("2026-10-01T12:00:00.000Z");
const at = new Date("2026-10-05T12:00:00.000Z");
const uv = "0192e8e8-45ad-7b12-8d90-73db122e70e1";
const base: PlanInput = {
  templateSince: since,
  templateActivities: [
    { code: "CLEAN", name: "Limpieza", triggerType: "time", frequencyDays: 7 },
    { code: "METER", name: "Medidor", triggerType: "usage", frequencyDays: null },
  ],
  componentActivities: [
    {
      componentCatalogId: uv,
      activeSince: new Date("2026-10-03T00:00:00.000Z"),
      activity: { code: "CLEAN", name: "Lámpara", defaultFrequency: { value: 6, unit: "months" } },
    },
  ],
  overrides: [],
  lastDone: new Map(),
  at,
};
const asPending = (planned: PlannedActivity[]): PendingActivity[] =>
  planned.map((p, index) => ({
    id: `id-${index}`,
    activityCode: p.activityCode,
    componentCatalogId: p.componentCatalogId,
    definition: JSON.parse(JSON.stringify(p.definition)) as unknown,
    dueAt: p.dueAt,
    alertAt: p.alertAt,
  }));

describe("TASK-F4-21 calendar plan", () => {
  it("uses the template and the active client components with factory values", () => {
    const plan = planActivities(base);
    expect(plan.map((p) => [p.key, p.dueAt?.toISOString() ?? null])).toEqual([
      [planKey("CLEAN", null), "2026-10-08T12:00:00.000Z"],
      [planKey("METER", null), null],
      // Same code as the template activity, kept apart by its component (RA-01-D3).
      [planKey("CLEAN", uv), "2027-04-03T00:00:00.000Z"],
    ]);
    expect(plan[0]!.definition.schedule).toEqual({
      frequency: { value: 7, unit: "days" },
      source: "TEMPLATE",
      factory: { value: 7, unit: "days" },
      alertLead: null,
      alertSource: null,
      anchor: since.toISOString(),
    });
    expect(plan[1]!.definition.schedule).toBeNull();
  });

  it("applies the effective frequency and alert lead, machine over account", () => {
    const plan = planActivities({
      ...base,
      overrides: [
        {
          scope: "ACCOUNT",
          activityCode: "CLEAN",
          componentCatalogId: null,
          frequency: { value: 2, unit: "weeks" },
          alertLead: { value: 2, unit: "days" },
          validFrom: since,
          validTo: null,
        },
        {
          scope: "MACHINE",
          activityCode: "CLEAN",
          componentCatalogId: uv,
          frequency: { value: 3, unit: "months" },
          alertLead: null,
          validFrom: since,
          validTo: null,
        },
      ],
    });
    expect(plan[0]).toMatchObject({
      dueAt: new Date("2026-10-15T12:00:00.000Z"),
      alertAt: new Date("2026-10-13T12:00:00.000Z"),
      definition: { schedule: { source: "ACCOUNT", factory: { value: 7, unit: "days" } } },
    });
    expect(plan[2]).toMatchObject({
      dueAt: new Date("2027-01-03T00:00:00.000Z"),
      alertAt: null,
      definition: { schedule: { source: "MACHINE" } },
    });
  });

  it("schedules the next occurrence after the latest work done", () => {
    const plan = planActivities({
      ...base,
      lastDone: new Map([[planKey("CLEAN", null), new Date("2026-10-20T12:00:00.000Z")]]),
    });
    expect(plan[0]!.dueAt).toEqual(new Date("2026-10-27T12:00:00.000Z"));
  });

  it("is a pure function of the state, whatever the input order", () => {
    const reversed: PlanInput = {
      ...base,
      overrides: [...base.overrides].reverse(),
      componentActivities: [...base.componentActivities].reverse(),
    };
    expect(canonical(planActivities(reversed))).toBe(canonical(planActivities(base)));
  });
});

describe("TASK-F4-21 calendar diff", () => {
  it("keeps identical pending activities: a repeated recalculation changes nothing", () => {
    const plan = planActivities(base);
    expect(diffSchedule(plan, asPending(plan), new Set())).toEqual({ cancel: [], insert: [] });
  });

  it("cancels the activities of a deactivated component and replaces changed ones", () => {
    const before = asPending(planActivities(base));
    const after = planActivities({ ...base, componentActivities: [] });
    expect(diffSchedule(after, before, new Set())).toEqual({ cancel: ["id-2"], insert: [] });
    const changed = planActivities({
      ...base,
      overrides: [
        {
          scope: "MACHINE",
          activityCode: "CLEAN",
          componentCatalogId: null,
          frequency: { value: 3, unit: "days" },
          alertLead: null,
          validFrom: since,
          validTo: null,
        },
      ],
    });
    const diff = diffSchedule(changed, before, new Set());
    expect(diff.cancel).toEqual(["id-0"]);
    expect(diff.insert.map((p) => [p.key, p.dueAt?.toISOString()])).toEqual([
      [planKey("CLEAN", null), "2026-10-04T12:00:00.000Z"],
    ]);
  });

  it("never replans a key with an overdue pending activity", () => {
    const plan = planActivities(base);
    const diff = diffSchedule(plan, [], new Set([planKey("CLEAN", null)]));
    expect(diff.insert.map((p) => p.key)).toEqual([planKey("METER", null), planKey("CLEAN", uv)]);
  });
});
