import { describe, expect, it } from "vitest";
import {
  accountDetailsSchema,
  branchInputSchema,
  activityInputSchema,
  approvalInputSchema,
} from "./equipment.js";
describe("Phase 4 input boundaries", () => {
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
