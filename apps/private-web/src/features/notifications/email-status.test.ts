import { describe, expect, it } from "vitest";
import { emailDeliveryStatusSchema } from "@ice24/contracts";
import { emailDeliveryText, emailStatusLabels } from "./email-status";

describe("notification center email status (F5-12)", () => {
  it("labels every delivery state in Spanish and shows the time of the last change", () => {
    expect(Object.keys(emailStatusLabels).sort()).toEqual(
      [...emailDeliveryStatusSchema.options].sort(),
    );
    expect(emailDeliveryText({ status: "bounced", updatedAt: "2026-10-03T12:05:00.000000Z" })).toBe(
      "Rebotado (03/10/26, 12:05 UTC)",
    );
    expect(emailDeliveryText(null)).toBeNull();
  });
});
