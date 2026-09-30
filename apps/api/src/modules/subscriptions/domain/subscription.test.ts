import { describe, expect, it } from "vitest";
import { subscriptionSchema, extendDemoSchema } from "@ice24/contracts";
import { newSubscription, subscriptionAccess, transitionSubscription } from "./subscription.js";

const now = "2026-09-24T12:00:00.000Z";
const id = "00000000-0000-4000-8000-000000000001";
const create = (demo = false) => newSubscription({ id, accountId: id, demo, now });
const payment = {
  type: "payment_confirmed",
  customerId: "cus_test",
  subscriptionId: "sub_test",
  periodStart: now,
  periodEnd: "2026-10-24T12:00:00.000Z",
} as const;
describe("subscription domain", () => {
  it("supports configured future price without changing an existing paid contract", () => {
    expect(
      transitionSubscription(create(), { type: "configure_terms", amountMinor: 45000 }, now).price
        .amountMinor,
    ).toBe(45000);
    expect(() =>
      transitionSubscription(create(), { type: "configure_terms", amountMinor: 399.5 }, now),
    ).toThrow();
    expect(() =>
      transitionSubscription(
        transitionSubscription(create(), payment, now),
        { type: "configure_terms", amountMinor: 45000 },
        now,
      ),
    ).toThrow("Stripe");
  });
  it("starts a 14-day independent demo and refuses in-place paid conversion", () => {
    const demo = create(true);
    expect(demo.demoExpiresAt).toBe("2026-10-08T12:00:00.000Z");
    expect(demo.price).toEqual({ amountMinor: 39900, currency: "MXN" });
    expect(subscriptionAccess(demo, "2026-10-08T11:59:59.999Z")).toBe("ACTIVE");
    expect(subscriptionAccess(demo, demo.demoExpiresAt!)).toBe("READ_ONLY");
    expect(() => transitionSubscription(demo, payment, now)).toThrow("separate production");
  });
  it("expires and extends a demo without changing its identity", () => {
    const demo = create(true),
      end = demo.demoExpiresAt!;
    const expired = transitionSubscription(demo, { type: "expire" }, end);
    expect(expired.status).toBe("read_only");
    const extended = transitionSubscription(
      expired,
      { type: "extend_demo", newExpiresAt: "2026-10-15T12:00:00Z" },
      end,
    );
    expect(extended.status).toBe("demo");
    expect(extended.accountId).toBe(demo.accountId);
    expect(() =>
      transitionSubscription(extended, { type: "extend_demo", newExpiresAt: end }, end),
    ).toThrow();
    expect(() => transitionSubscription(demo, { type: "expire" }, now)).toThrow();
  });
  it("restricts pending, failed and cancelled subscriptions and restores paid access", () => {
    const pending = create();
    expect(subscriptionAccess(pending, now)).toBe("READ_ONLY");
    const active = transitionSubscription(pending, payment, now);
    const failed = transitionSubscription(active, { type: "payment_failed" }, now);
    expect(failed.status).toBe("payment_failed");
    expect(subscriptionAccess(failed, now)).toBe("READ_ONLY");
    const reactivated = transitionSubscription(failed, payment, now);
    expect(reactivated.status).toBe("reactivated");
    expect(subscriptionAccess(reactivated, now)).toBe("ACTIVE");
    expect(active.status).toBe("active");
    expect(pending.version).toBe(1);
  });
  it("keeps paid access until the exact cancellation boundary", () => {
    const active = transitionSubscription(create(), payment, now);
    const scheduled = transitionSubscription(active, { type: "schedule_cancellation" }, now);
    expect(subscriptionAccess(scheduled, "2026-10-24T11:59:59.999Z")).toBe("ACTIVE");
    expect(subscriptionAccess(scheduled, payment.periodEnd)).toBe("READ_ONLY");
    expect(() => transitionSubscription(scheduled, { type: "expire" }, now)).toThrow();
    const cancelled = transitionSubscription(scheduled, { type: "expire" }, payment.periodEnd);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelAtPeriodEnd).toBe(false);
    const reactivated = transitionSubscription(
      cancelled,
      {
        ...payment,
        subscriptionId: "sub_replacement",
        periodStart: payment.periodEnd,
        periodEnd: "2026-11-24T12:00:00.000Z",
      },
      payment.periodEnd,
    );
    expect(reactivated.status).toBe("reactivated");
    expect(reactivated.providerSubscriptionId).toBe("sub_replacement");
    expect(() =>
      transitionSubscription(scheduled, { type: "reverse_cancellation" }, payment.periodEnd),
    ).toThrow();
    expect(transitionSubscription(scheduled, { type: "reverse_cancellation" }, now).status).toBe(
      "active",
    );
  });
  it("preserves cancellation when an already paid period is confirmed", () => {
    const scheduled = transitionSubscription(
      transitionSubscription(create(), payment, now),
      { type: "schedule_cancellation" },
      now,
    );
    expect(transitionSubscription(scheduled, payment, now).cancelAtPeriodEnd).toBe(true);
  });
  it("rejects foreign provider IDs, stale periods and future or invalid payment dates", () => {
    const active = transitionSubscription(create(), payment, now);
    expect(() =>
      transitionSubscription(active, { ...payment, customerId: "cus_other" }, now),
    ).toThrow();
    expect(() =>
      transitionSubscription(active, { ...payment, periodEnd: "2026-10-01T00:00:00Z" }, now),
    ).toThrow("Stale");
    expect(() =>
      transitionSubscription(create(), { ...payment, periodStart: payment.periodEnd }, now),
    ).toThrow();
    expect(() =>
      transitionSubscription(create(), { ...payment, periodEnd: "invalid" }, now),
    ).toThrow();
  });
  it("validates contract invariants including provider-nullability and integer money", () => {
    expect(subscriptionSchema.safeParse(create(true)).success).toBe(true);
    expect(subscriptionSchema.safeParse({ ...create(), status: "active" }).success).toBe(false);
    expect(
      subscriptionSchema.safeParse({ ...create(), price: { amountMinor: 399.1, currency: "MXN" } })
        .success,
    ).toBe(false);
    expect(subscriptionSchema.safeParse({ ...create(), status: "demo" }).success).toBe(false);
    expect(
      extendDemoSchema.safeParse({ newExpiresAt: now, reason: "short", accountId: id }).success,
    ).toBe(false);
  });
});
