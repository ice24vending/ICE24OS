import { describe, it, expect } from "vitest";
import { demoApiResponse } from "./api";
import { defaultDemoState } from "./state";
import { workOrderPageSchema, workOrderDetailSchema } from "@ice24/contracts";
describe("work orders demo scope and contracts", () => {
  it.each(["owner", "admin", "technician", "readonly", "ice24", "platform"] as const)(
    "validates %s scoped orders and assignment permissions",
    async (persona) => {
      const state = { ...defaultDemoState(), persona };
      const page = workOrderPageSchema.parse(
        await (await demoApiResponse("work-orders", {}, state)).json(),
      );
      expect(page.items.length).toBeGreaterThan(0);
      const detail = workOrderDetailSchema.parse(
        await (await demoApiResponse(`work-orders/${page.items[0]!.id}`, {}, state)).json(),
      );
      expect(detail.actions.find((a) => a.action === "start")?.allowed).toBe(
        persona === "technician",
      );
      const options = await demoApiResponse(
        "work-orders/options/ticket/70000000-0000-4000-8000-000000000384",
        {},
        state,
      );
      expect(options.status).toBe(["owner", "admin"].includes(persona) ? 200 : 403);
    },
  );
  it("rejects foreign orders and disabled module and does not pretend downloaded storage", async () => {
    const state = defaultDemoState();
    expect(
      (await demoApiResponse("work-orders/10000000-0000-4000-8000-000000000bb8", {}, state)).status,
    ).toBe(404);
    expect(
      (await demoApiResponse("work-orders", {}, { ...state, maintenance: "disabled" })).status,
    ).toBe(403);
    expect(
      (await (await demoApiResponse("work-orders?view=downloaded", {}, state)).json()).items,
    ).toEqual([]);
  });
});
