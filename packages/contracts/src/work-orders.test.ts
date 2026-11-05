import { describe, it, expect } from "vitest";
import {
  workOrderCreateSchema,
  workOrderTransitionSchema,
  workOrderDefinitionSchema,
} from "./private/maintenance/work-orders.js";
const id = "10000000-0000-4000-8000-000000000001";
describe("work order command boundaries", () => {
  it("rejects caller-controlled account, definition and state", () => {
    const input = {
      sourceType: "ticket",
      sourceId: id,
      assigneeId: id,
      activityCode: "FILTER",
      reason: "Servicio programado",
    };
    expect(workOrderCreateSchema.safeParse(input).success).toBe(true);
    for (const extra of [{ accountId: id }, { state: "completed" }, { definition: {} }])
      expect(workOrderCreateSchema.safeParse({ ...input, ...extra }).success).toBe(false);
  });
  it("never accepts execution/evidence facts through a transition", () => {
    expect(
      workOrderTransitionSchema.safeParse({
        action: "complete",
        executionComplete: true,
        evidenceComplete: true,
      }).success,
    ).toBe(false);
    expect(
      workOrderTransitionSchema.safeParse({ action: "reopen", reason: "Reabrir orden" }).success,
    ).toBe(false);
  });
  it("preserves scheduled account-component metadata without inventing procedure or parts", () => {
    const definition = {
      code: "FILTER",
      name: "Revisar filtro",
      category: "maintenance",
      defaultFrequency: { value: 2, unit: "months" },
      componentCatalogId: id,
      checklist: [{ code: "CHECK", label: "Revisar filtro", required: true }],
      evidenceRules: { required: true, minimumFiles: 1 },
      schedule: { source: "MACHINE", frequency: { value: 1, unit: "months" } },
    };
    expect(workOrderDefinitionSchema.parse(definition)).toEqual(definition);
  });
});
