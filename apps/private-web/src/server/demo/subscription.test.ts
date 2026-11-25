import { describe, expect, it } from "vitest";
import { subscriptionPaymentsSchema } from "@ice24/contracts";
import { demoApiResponse } from "./api";
import { defaultDemoState } from "./state";
describe("billing history demo", () => {
  it("provides varied payments, empty and an independent failure with a support reference", async () => {
    const state = defaultDemoState();
    const page = subscriptionPaymentsSchema.parse(
      await (await demoApiResponse("subscription/payments", {}, state)).json(),
    );
    expect(page.items).toHaveLength(6);
    expect(new Set(page.items.map((item) => item.amountMinor)).size).toBeGreaterThan(1);
    expect(
      await (
        await demoApiResponse("subscription/payments", {}, { ...state, scenario: "empty" })
      ).json(),
    ).toEqual({ items: [] });
    expect(
      await (
        await demoApiResponse("subscription/payments", {}, { ...state, account: "bajio" })
      ).json(),
    ).toEqual({ items: [] });
    const failure = await demoApiResponse(
      "subscription/payments",
      {},
      { ...state, scenario: "conflict" },
    );
    expect(failure.status).toBe(503);
    expect((await failure.json()).error.correlationId).toBeTruthy();
    expect(
      (await demoApiResponse("subscription", {}, { ...state, scenario: "conflict" })).status,
    ).toBe(200);
  });
  it.each(["technician", "readonly", "admin", "platform", "ice24"] as const)(
    "denies %s like the billing portal",
    async (persona) => {
      expect(
        (await demoApiResponse("subscription/payments", {}, { ...defaultDemoState(), persona }))
          .status,
      ).toBe(403);
    },
  );
});
