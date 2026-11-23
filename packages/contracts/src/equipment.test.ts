import { describe, expect, it } from "vitest";
import {
  accountDetailsSchema,
  branchInputSchema,
  branchUpdateSchema,
  activityInputSchema,
  approvalInputSchema,
} from "./equipment.js";
describe("Phase 4 input boundaries", () => {
  it("accepts optional branch metadata and partial edits without synthesizing omitted fields", () => {
    expect(branchUpdateSchema.parse({ name: "Nuevo nombre" })).toEqual({ name: "Nuevo nombre" });
    expect(
      branchUpdateSchema.parse({
        code: " cumbres-01 ",
        city: "Monterrey",
        state: "Nuevo León",
        notes: "Acceso lateral",
      }).code,
    ).toBe("CUMBRES-01");
    expect(branchUpdateSchema.safeParse({}).success).toBe(false);
    expect(branchUpdateSchema.safeParse({ code: "NO ESPACIOS" }).success).toBe(false);
    expect(branchUpdateSchema.safeParse({ notes: "a".repeat(2001) }).success).toBe(false);
    expect(branchUpdateSchema.safeParse({ account_id: "otra cuenta" }).success).toBe(false);
  });
  it("rejects coordinates outside the geographic range and unrecognized timezone", () => {
    const input = {
      name: "QA",
      address: "Synthetic",
      latitude: 19,
      longitude: -99,
      timezone: "America/Mexico_City",
      schedule: "",
      publicPhone: "",
      ownerPhonePublic: false,
      referenceTemperature: null,
    };
    expect(branchInputSchema.safeParse(input).success).toBe(true);
    expect(branchInputSchema.safeParse({ ...input, latitude: 91 }).success).toBe(false);
    expect(branchInputSchema.safeParse({ ...input, timezone: "Invalid/Zone" }).success).toBe(false);
    expect(branchInputSchema.safeParse({ ...input, accountId: "untrusted" }).success).toBe(false);
  });
  it("requires declared triggers and evidence minimums", () => {
    const input = {
      code: "CHECK",
      name: "Inspect",
      category: "inspection",
      triggerType: "time",
      frequencyDays: null,
      triggerDescription: "",
      responsibleRole: "TC",
      checklist: [{ code: "CHECK", label: "Check", required: true }],
      fields: [],
      evidenceRules: { required: true, minimumFiles: 0 },
      escalationRules: { afterHours: 24, notifyRole: "OW" },
      criticality: "medium",
    };
    expect(activityInputSchema.safeParse(input).success).toBe(false);
    expect(
      activityInputSchema.safeParse({
        ...input,
        frequencyDays: 7,
        evidenceRules: { required: true, minimumFiles: 1 },
      }).success,
    ).toBe(true);
    expect(
      activityInputSchema.safeParse({
        ...input,
        triggerType: "usage",
        evidenceRules: { required: false, minimumFiles: 0 },
      }).success,
    ).toBe(false);
  });
  it("does not accept status escalation in account or approval inputs", () => {
    expect(accountDetailsSchema.safeParse({ access_mode: "ACTIVE" }).success).toBe(false);
    expect(approvalInputSchema.safeParse({ confirmation: false }).success).toBe(false);
  });
});
