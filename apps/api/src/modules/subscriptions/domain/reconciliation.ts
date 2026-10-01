import { subscriptionSchema, type Subscription } from "@ice24/contracts";
import { SubscriptionRuleError } from "./subscription.js";

/** Provider observations are supplied by a verified adapter, never browser input. */
export interface ReconciliationSnapshot {
  readonly accountId: string;
  readonly providerCustomerId: string;
  readonly providerSubscriptionId: string;
  readonly providerStatus: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly currentPeriodStart: string | null;
  readonly currentPeriodEnd: string | null;
  readonly cancelAtPeriodEnd: boolean;
  readonly paymentStatus: "paid" | "failed" | "pending" | "unknown";
}

export function reconcileSubscription(
  previous: Subscription,
  snapshot: ReconciliationSnapshot,
  now: string,
): Subscription | null {
  if (
    previous.isDemo ||
    snapshot.accountId !== previous.accountId ||
    (previous.providerCustomerId !== null &&
      previous.providerCustomerId !== snapshot.providerCustomerId)
  )
    throw new SubscriptionRuleError("Provider account mismatch");
  if (
    snapshot.currency.toUpperCase() !== previous.price.currency ||
    snapshot.amountMinor !== previous.price.amountMinor
  )
    throw new SubscriptionRuleError("Provider plan mismatch");
  // An event from a retired subscription cannot replace the current subscription.
  if (
    previous.providerSubscriptionId &&
    previous.providerSubscriptionId !== snapshot.providerSubscriptionId &&
    !(
      previous.status === "cancelled" &&
      snapshot.providerStatus === "active" &&
      snapshot.paymentStatus === "paid"
    )
  )
    return null;
  const time = Date.parse(now),
    start = Date.parse(snapshot.currentPeriodStart ?? ""),
    end = Date.parse(snapshot.currentPeriodEnd ?? "");
  if (!Number.isFinite(time) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new SubscriptionRuleError("Invalid provider period");
  if (
    previous.currentPeriodEnd &&
    end < Date.parse(previous.currentPeriodEnd) &&
    snapshot.providerStatus !== "canceled"
  )
    throw new SubscriptionRuleError("Provider period regressed");
  const next: Subscription = {
    ...previous,
    providerCustomerId: snapshot.providerCustomerId,
    providerSubscriptionId: snapshot.providerSubscriptionId,
    currentPeriodStart: snapshot.currentPeriodStart,
    currentPeriodEnd: snapshot.currentPeriodEnd,
    cancelAtPeriodEnd: false,
    version: previous.version + 1,
    updatedAt: now,
  };
  const hasPaidAccess =
    ["active", "reactivated", "cancellation_scheduled"].includes(previous.status) &&
    previous.currentPeriodStart !== null &&
    Date.parse(previous.currentPeriodStart) <= time &&
    previous.currentPeriodEnd !== null &&
    Date.parse(previous.currentPeriodEnd) > time;
  if (snapshot.providerStatus === "canceled") {
    // Honor an already paid period even if the external cancellation was immediate.
    const paid = hasPaidAccess;
    next.status = paid ? "cancellation_scheduled" : "cancelled";
    next.cancelAtPeriodEnd = paid;
    if (paid) {
      next.currentPeriodStart = previous.currentPeriodStart;
      next.currentPeriodEnd = previous.currentPeriodEnd;
    }
  } else if (
    ["past_due", "unpaid"].includes(snapshot.providerStatus) ||
    snapshot.paymentStatus === "failed"
  ) {
    next.status = "payment_failed";
  } else if (
    snapshot.providerStatus === "active" &&
    snapshot.paymentStatus === "paid" &&
    start <= time &&
    end > time
  ) {
    next.status = snapshot.cancelAtPeriodEnd
      ? "cancellation_scheduled"
      : ["payment_failed", "read_only", "cancelled", "reactivated"].includes(previous.status)
        ? "reactivated"
        : "active";
    next.cancelAtPeriodEnd = snapshot.cancelAtPeriodEnd;
  } else if (snapshot.providerStatus === "incomplete_expired") {
    next.status = "cancelled";
  } else if (["active", "incomplete", "paused", "trialing"].includes(snapshot.providerStatus)) {
    // No implicit trial or access grant based solely on subscription.status.
    if (snapshot.providerStatus === "active" && hasPaidAccess) {
      // An unconfirmed renewal does not erase an already paid period or extend it.
      next.currentPeriodStart = previous.currentPeriodStart;
      next.currentPeriodEnd = previous.currentPeriodEnd;
      next.cancelAtPeriodEnd = snapshot.cancelAtPeriodEnd;
      next.status = snapshot.cancelAtPeriodEnd
        ? "cancellation_scheduled"
        : previous.status === "reactivated"
          ? "reactivated"
          : "active";
    } else
      next.status = previous.status === "pending_activation" ? "pending_activation" : "read_only";
  } else throw new SubscriptionRuleError("Unsupported provider status");
  subscriptionSchema.parse(next);
  const comparable = (s: Subscription) =>
    JSON.stringify({
      ...s,
      version: 0,
      updatedAt: "",
      currentPeriodStart: s.currentPeriodStart === null ? null : Date.parse(s.currentPeriodStart),
      currentPeriodEnd: s.currentPeriodEnd === null ? null : Date.parse(s.currentPeriodEnd),
    });
  return comparable(next) === comparable(previous) ? null : next;
}
