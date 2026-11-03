import { describe, expect, it } from "vitest";
import { ticketPageSchema, ticketDetailSchema } from "@ice24/contracts";
import { demoApiResponse } from "./api";
import { defaultDemoState } from "./state";
describe("ticket demo contracts and scope", () => {
  it.each(["owner", "admin", "technician", "readonly", "ice24", "platform"] as const)(
    "serves valid scoped data to %s",
    async (persona) => {
      const state = { ...defaultDemoState(), persona };
      const response = await demoApiResponse("tickets", {}, state);
      const page = ticketPageSchema.parse(await response.json());
      expect(page.items.length).toBeGreaterThan(0);
      const detail = await demoApiResponse(`tickets/${page.items[0]!.id}`, {}, state);
      expect(ticketDetailSchema.parse(await detail.json()).events).toHaveLength(2);
    },
  );
  it("denies disabled module and foreign account ticket", async () => {
    expect(
      (await demoApiResponse("tickets", {}, { ...defaultDemoState(), maintenance: "disabled" }))
        .status,
    ).toBe(403);
    expect(
      (
        await demoApiResponse(
          "tickets/70000000-0000-4000-8000-000000000384",
          {},
          { ...defaultDemoState(), account: "bajio" },
        )
      ).status,
    ).toBe(404);
  });
});
