import { describe, expect, it } from "vitest";
import { maintenancePageSchema, maintenanceSummarySchema } from "@ice24/contracts";
import { demoApiResponse } from "./api";
import { defaultDemoState } from "./state";
import { DEMO_ACCOUNTS } from "./fixtures";

describe("F7 maintenance demo matches authorized contracts", () => {
  it.each(["owner", "admin", "technician", "readonly", "ice24"] as const)(
    "lists only the reach of %s",
    async (persona) => {
      const state = { ...defaultDemoState(), persona };
      const page = maintenancePageSchema.parse(
        await (await demoApiResponse("maintenance/activities", {}, state)).json(),
      );
      expect(page.items.length).toBeGreaterThan(0);
      if (persona === "admin" || persona === "technician")
        expect(page.items.every((row) => row.branchId === state.branch)).toBe(true);
      const denied = maintenancePageSchema.parse(
        await (
          await demoApiResponse(
            `maintenance/activities?machineId=${DEMO_ACCOUNTS.bajio.machines[0]!.id}`,
            {},
            state,
          )
        ).json(),
      );
      expect(denied.items).toEqual([]);
    },
  );
  it("KPI equals the linked filtered list in the active context", async () => {
    const state = {
      ...defaultDemoState(),
      focus: { branchId: DEMO_ACCOUNTS.polar.branches[0]!.id, machineId: null },
    };
    const summary = maintenanceSummarySchema.parse(
      await (await demoApiResponse("maintenance/summary", {}, state)).json(),
    );
    const page = maintenancePageSchema.parse(
      await (await demoApiResponse("maintenance/activities?period=next7days", {}, state)).json(),
    );
    expect(summary.upcoming).toBe(page.items.length);
    const overdue = maintenancePageSchema.parse(
      await (await demoApiResponse("maintenance/activities?state=overdue", {}, state)).json(),
    );
    expect(overdue.items.length).toBeGreaterThan(0);
  });
  it("denies disabled module and revoked technician", async () => {
    for (const maintenance of ["disabled", "revoked"] as const) {
      const response = await demoApiResponse(
        "maintenance/summary",
        {},
        { ...defaultDemoState(), persona: "technician", maintenance },
      );
      expect(response.status).toBe(403);
    }
  });
});
