import { describe, expect, it } from "vitest";
import { newSubscription, subscriptionAccess } from "./subscription.js";
import { reconcileSubscription, type ReconciliationSnapshot } from "./reconciliation.js";

const now = "2026-09-30T12:00:00Z";
const pending = () =>
  newSubscription({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    accountId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    demo: false,
    now,
  });
const paid: ReconciliationSnapshot = {
  accountId: pending().accountId,
  providerCustomerId: "cus_test",
  providerSubscriptionId: "sub_test",
  providerStatus: "active",
  amountMinor: 39900,
  currency: "mxn",
  currentPeriodStart: "2026-09-29T12:00:00Z",
  currentPeriodEnd: "2026-10-29T12:00:00Z",
  cancelAtPeriodEnd: false,
  paymentStatus: "paid",
};
describe("Provider reconciliation", () => {
  it("activates only a confirmed paid period and is semantically idempotent", () => {
    const active = reconcileSubscription(pending(), paid, now)!;
    expect(active.status).toBe("active");
    expect(reconcileSubscription(active, paid, now)).toBeNull();
    expect(
      reconcileSubscription(
        {
          ...active,
          currentPeriodStart: active.currentPeriodStart!.replace("Z", "+00:00"),
          currentPeriodEnd: active.currentPeriodEnd!.replace("Z", "+00:00"),
        },
        paid,
        now,
      ),
    ).toBeNull();
    expect(
      reconcileSubscription(pending(), { ...paid, paymentStatus: "pending" }, now)?.status,
    ).toBe("pending_activation");
  });
  it("restricts initial and renewal failure, and reactivates on confirmed payment", () => {
    const failed = reconcileSubscription(
      pending(),
      { ...paid, providerStatus: "past_due", paymentStatus: "failed" },
      now,
    )!;
    expect(failed.status).toBe("payment_failed");
    expect(subscriptionAccess(failed, now)).toBe("READ_ONLY");
    expect(reconcileSubscription(failed, paid, now)?.status).toBe("reactivated");
  });
  it("preserves a paid period on cancellation and removes access at its exact end", () => {
    const active = reconcileSubscription(pending(), paid, now)!;
    const cancelled = reconcileSubscription(active, { ...paid, providerStatus: "canceled" }, now)!;
    expect(cancelled.status).toBe("cancellation_scheduled");
    expect(subscriptionAccess(cancelled, now)).toBe("ACTIVE");
    const expired = reconcileSubscription(
      cancelled,
      { ...paid, providerStatus: "canceled" },
      paid.currentPeriodEnd!,
    )!;
    expect(expired.status).toBe("cancelled");
    expect(subscriptionAccess(expired, paid.currentPeriodEnd!)).toBe("READ_ONLY");
  });
  it("handles scheduled cancellation and reversal from current provider state", () => {
    const scheduled = reconcileSubscription(pending(), { ...paid, cancelAtPeriodEnd: true }, now)!;
    expect(scheduled.status).toBe("cancellation_scheduled");
    expect(reconcileSubscription(scheduled, paid, now)?.cancelAtPeriodEnd).toBe(false);
  });
  it("preserves an already paid period during a pending renewal without extending access", () => {
    const active = reconcileSubscription(pending(), paid, now)!;
    expect(
      reconcileSubscription(
        active,
        { ...paid, paymentStatus: "pending", currentPeriodEnd: "2026-11-29T12:00:00Z" },
        now,
      ),
    ).toBeNull();
    const restricted = reconcileSubscription(
      active,
      { ...paid, paymentStatus: "pending", currentPeriodEnd: "2026-11-29T12:00:00Z" },
      paid.currentPeriodEnd!,
    )!;
    expect(restricted.status).toBe("read_only");
  });
  it("never grants a demo or another account access", () => {
    expect(() =>
      reconcileSubscription(
        { ...pending(), isDemo: true, demoExpiresAt: "2026-10-01T12:00:00Z", status: "demo" },
        paid,
        now,
      ),
    ).toThrow("account mismatch");
    expect(() => reconcileSubscription(pending(), { ...paid, accountId: "other" }, now)).toThrow(
      "account mismatch",
    );
    expect(() => reconcileSubscription(pending(), { ...paid, amountMinor: 1 }, now)).toThrow(
      "plan mismatch",
    );
  });
  it("ignores a retired subscription and rejects regressing periods", () => {
    const active = reconcileSubscription(pending(), paid, now)!;
    expect(
      reconcileSubscription(
        active,
        { ...paid, providerSubscriptionId: "sub_old", providerStatus: "canceled" },
        now,
      ),
    ).toBeNull();
    expect(() =>
      reconcileSubscription(active, { ...paid, currentPeriodEnd: "2026-10-01T12:00:00Z" }, now),
    ).toThrow("regressed");
  });
  it("does not grant access for future or expired paid periods", () => {
    expect(
      subscriptionAccess(
        reconcileSubscription(
          pending(),
          { ...paid, currentPeriodStart: "2026-10-01T12:00:00Z" },
          now,
        )!,
        now,
      ),
    ).toBe("READ_ONLY");
    expect(
      subscriptionAccess(
        reconcileSubscription(pending(), paid, "2026-10-30T12:00:00Z")!,
        "2026-10-30T12:00:00Z",
      ),
    ).toBe("READ_ONLY");
  });
});
