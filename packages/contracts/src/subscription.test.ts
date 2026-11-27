import { expect, it } from "vitest";
import { subscriptionPaymentsSchema } from "./subscription.js";
const payment = {
  id: "in_fixture",
  number: null,
  createdAt: "2026-10-20T16:00:00Z",
  amountMinor: 39900,
  currency: "MXN",
  status: "paid",
};
it("limits history to 12 records and rejects sensitive provider fields", () => {
  expect(
    subscriptionPaymentsSchema.safeParse({ items: Array.from({ length: 12 }, () => payment) })
      .success,
  ).toBe(true);
  expect(
    subscriptionPaymentsSchema.safeParse({ items: Array.from({ length: 13 }, () => payment) })
      .success,
  ).toBe(false);
  expect(
    subscriptionPaymentsSchema.safeParse({ items: [{ ...payment, card: { number: "secret" } }] })
      .success,
  ).toBe(false);
});
