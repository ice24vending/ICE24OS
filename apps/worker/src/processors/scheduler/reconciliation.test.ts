import { describe, expect, it } from "vitest";
import {
  FakeSubscriptionObservationSource,
  ObservationUnavailableError,
  compareSubscription,
  type LocalSubscription,
  type ProviderSubscriptionObservation,
} from "./reconciliation.js";
import { observationSourceFromEnvironment } from "./tasks.js";

const account = "22222222-2222-4222-8222-222222222222";
const local: LocalSubscription = {
  accountId: account,
  providerCustomerId: "cus_A",
  status: "active",
  amountMinor: 39900,
  currency: "MXN",
  currentPeriodEnd: "2026-10-20T00:00:00.000Z",
  cancelAtPeriodEnd: false,
};
const remote: ProviderSubscriptionObservation = {
  accountId: account,
  providerCustomerId: "cus_A",
  providerSubscriptionId: "sub_A",
  providerStatus: "active",
  amountMinor: 39900,
  currency: "mxn",
  currentPeriodStart: "2026-09-20T00:00:00.000Z",
  currentPeriodEnd: "2026-10-20T00:00:00Z",
  cancelAtPeriodEnd: false,
};
const kinds = (l: LocalSubscription, r: ProviderSubscriptionObservation | null) =>
  compareSubscription(l, r).map((f) => f.kind);

describe("Stripe reconciliation comparison (F5-13)", () => {
  it("finds nothing when local state matches the provider", () => {
    expect(kinds(local, remote)).toEqual([]);
    expect(
      kinds(
        { ...local, status: "cancellation_scheduled", cancelAtPeriodEnd: true },
        { ...remote, cancelAtPeriodEnd: true },
      ),
    ).toEqual([]);
    // ADR-024: an immediate provider cancellation keeps the paid period locally.
    expect(
      kinds(
        { ...local, status: "cancellation_scheduled", cancelAtPeriodEnd: true },
        { ...remote, providerStatus: "canceled" },
      ),
    ).toEqual([]);
    expect(
      kinds({ ...local, status: "payment_failed" }, { ...remote, providerStatus: "past_due" }),
    ).toEqual([]);
  });

  it("records status, cancellation, period and price differences without deciding a fix", () => {
    expect(kinds({ ...local, status: "payment_failed" }, remote)).toEqual(["STATUS_MISMATCH"]);
    expect(kinds(local, { ...remote, cancelAtPeriodEnd: true })).toEqual(["CANCELLATION_MISMATCH"]);
    expect(kinds(local, { ...remote, currentPeriodEnd: "2026-11-20T00:00:00Z" })).toEqual([
      "PERIOD_MISMATCH",
    ]);
    expect(kinds(local, { ...remote, amountMinor: 49900 })).toEqual(["PRICE_MISMATCH"]);
    const [finding] = compareSubscription({ ...local, status: "cancelled" }, remote);
    expect(finding).toEqual({
      kind: "STATUS_MISMATCH",
      local: {
        status: "cancelled",
        currentPeriodEnd: "2026-10-20T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        amountMinor: 39900,
        currency: "MXN",
      },
      remote: {
        status: "active",
        currentPeriodEnd: "2026-10-20T00:00:00Z",
        cancelAtPeriodEnd: false,
        amountMinor: 39900,
        currency: "MXN",
      },
    });
  });

  it("reports a missing or foreign provider subscription without comparing fields", () => {
    expect(kinds(local, null)).toEqual(["REMOTE_NOT_FOUND"]);
    expect(
      kinds(local, {
        ...remote,
        accountId: "33333333-3333-4333-8333-333333333333",
        amountMinor: 1,
      }),
    ).toEqual(["OWNERSHIP_MISMATCH"]);
    expect(kinds(local, { ...remote, providerCustomerId: "cus_B" })).toEqual([
      "OWNERSHIP_MISMATCH",
    ]);
  });

  it("fake source answers deterministically and simulates outages", async () => {
    const source = new FakeSubscriptionObservationSource();
    source.set(remote);
    source.failNext(1);
    const reference = {
      accountId: account,
      providerCustomerId: "cus_A",
      providerSubscriptionId: "sub_A",
    };
    await expect(source.observe(reference)).rejects.toBeInstanceOf(ObservationUnavailableError);
    await expect(source.observe(reference)).resolves.toEqual(remote);
    source.remove("sub_A");
    await expect(source.observe(reference)).resolves.toBeNull();
  });

  it("selects no provider source until the Stripe adapter is validated remotely", () => {
    expect(observationSourceFromEnvironment({})).toEqual({
      source: null,
      reason: "STRIPE_RECONCILIATION_NOT_CONFIGURED",
    });
    expect(
      observationSourceFromEnvironment({ STRIPE_SECRET_KEY: "configured-placeholder" }),
    ).toEqual({
      source: null,
      reason: "STRIPE_RECONCILIATION_PENDING_VALIDATION",
    });
  });
});
