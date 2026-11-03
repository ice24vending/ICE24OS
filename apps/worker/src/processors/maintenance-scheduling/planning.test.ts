import { describe, expect, it } from "vitest";
import { planActivities, diffSchedule, type PlanInput } from "../scheduling-plan.js";
const input: PlanInput = {
  templateSince: new Date("2026-03-01T15:00:00Z"),
  installedAt: new Date("2026-03-07T15:00:00Z"),
  timezone: "America/New_York",
  at: new Date("2026-03-07T16:00:00Z"),
  templateActivities: [{ code: "FILTER", triggerType: "time", frequencyDays: 1 }],
  componentActivities: [],
  overrides: [],
  lastDone: new Map(),
};
describe("F7 generation", () => {
  it("anchors at installation and applies local calendar rules", () => {
    const first = planActivities(input)[0]!;
    expect(first.dueAt?.toISOString()).toBe("2026-03-08T14:00:00.000Z");
    expect(first.definition.schedule).toMatchObject({
      anchor: "2026-03-07T15:00:00.000Z",
      timezone: "America/New_York",
    });
  });
  it("replays without duplicates and replaces only future occurrences for a new template", () => {
    const plan = planActivities(input);
    const pending = plan.map((p) => ({ ...p, id: "existing" }));
    expect(diffSchedule(plan, pending, new Set())).toEqual({ cancel: [], insert: [] });
    const changed = planActivities({
      ...input,
      templateActivities: [{ code: "FILTER", triggerType: "time", frequencyDays: 2 }],
    });
    expect(diffSchedule(changed, pending, new Set()).cancel).toEqual(["existing"]);
    expect(diffSchedule(changed, [], new Set(["template:FILTER"]))).toEqual({
      cancel: [],
      insert: [],
    });
  });
  it("retires future component occurrences without discarding overdue work", () => {
    const plan = planActivities({
      ...input,
      componentActivities: [
        {
          componentCatalogId: "own",
          activeSince: input.templateSince,
          activity: { code: "UV", defaultFrequency: { value: 1, unit: "months" } },
        },
      ],
    });
    const future = plan.map((p) => ({ ...p, id: p.key }));
    expect(diffSchedule(planActivities(input), future, new Set()).cancel).toEqual(["own:UV"]);
    expect(
      diffSchedule(
        planActivities(input),
        future.filter((p) => p.componentCatalogId === null),
        new Set(["own:UV"]),
      ).cancel,
    ).toEqual([]);
  });
});
