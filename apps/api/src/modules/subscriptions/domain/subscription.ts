import type { Subscription } from "@ice24/contracts";

export class SubscriptionRuleError extends Error {}
export type SubscriptionCommand =
  | {
      type: "payment_confirmed";
      customerId: string;
      subscriptionId: string;
      periodStart: string;
      periodEnd: string;
    }
  | { type: "payment_failed" }
  | { type: "enter_read_only" }
  | { type: "schedule_cancellation" }
  | { type: "reverse_cancellation" }
  | { type: "expire" }
  | { type: "configure_terms"; amountMinor: number }
  | { type: "extend_demo"; newExpiresAt: string };

const instant = (value: string): number => {
  const result = Date.parse(value);
  if (!Number.isFinite(result)) throw new SubscriptionRuleError("Invalid timestamp");
  return result;
};
const requireRule = (condition: boolean, message: string): void => {
  if (!condition) throw new SubscriptionRuleError(message);
};
export function subscriptionAccess(s: Subscription, now: string): "ACTIVE" | "READ_ONLY" {
  const time = instant(now);
  if (s.isDemo)
    return s.status === "demo" && s.demoExpiresAt !== null && instant(s.demoExpiresAt) > time
      ? "ACTIVE"
      : "READ_ONLY";
  if (s.status === "cancellation_scheduled")
    return s.currentPeriodEnd !== null && instant(s.currentPeriodEnd) > time
      ? "ACTIVE"
      : "READ_ONLY";
  return s.status === "active" || s.status === "reactivated" ? "ACTIVE" : "READ_ONLY";
}

export function newSubscription(input: {
  id: string;
  accountId: string;
  demo: boolean;
  now: string;
}): Subscription {
  return {
    id: input.id,
    accountId: input.accountId,
    provider: "stripe",
    providerCustomerId: null,
    providerSubscriptionId: null,
    planCode: "ICE24_MONTHLY",
    price: { amountMinor: 39900, currency: "MXN" },
    status: input.demo ? "demo" : "pending_activation",
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    isDemo: input.demo,
    demoExpiresAt: input.demo ? new Date(instant(input.now) + 14 * 86400000).toISOString() : null,
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function transitionSubscription(
  s: Subscription,
  command: SubscriptionCommand,
  now: string,
): Subscription {
  const time = instant(now);
  const next = { ...s, price: { ...s.price }, version: s.version + 1, updatedAt: now };
  switch (command.type) {
    case "configure_terms":
      requireRule(
        ["demo", "pending_activation"].includes(s.status),
        "Paid price changes require Stripe reconciliation",
      );
      requireRule(
        Number.isSafeInteger(command.amountMinor) && command.amountMinor >= 0,
        "Price must be nonnegative integer cents",
      );
      next.price = { amountMinor: command.amountMinor, currency: "MXN" };
      break;
    case "payment_confirmed": {
      requireRule(!s.isDemo, "Create a separate production account before accepting payment");
      requireRule(
        command.customerId.trim().length > 0 && command.subscriptionId.trim().length > 0,
        "Provider identifiers are required",
      );
      const start = instant(command.periodStart),
        end = instant(command.periodEnd);
      requireRule(
        start <= time && end > time && end > start,
        "Payment must cover the current period",
      );
      requireRule(
        s.providerCustomerId === null || s.providerCustomerId === command.customerId,
        "Provider customer mismatch",
      );
      requireRule(
        s.status === "cancelled" ||
          s.providerSubscriptionId === null ||
          s.providerSubscriptionId === command.subscriptionId,
        "Provider subscription mismatch",
      );
      requireRule(
        s.currentPeriodEnd === null || end >= instant(s.currentPeriodEnd),
        "Stale billing period",
      );
      next.providerCustomerId = command.customerId;
      next.providerSubscriptionId = command.subscriptionId;
      next.currentPeriodStart = command.periodStart;
      next.currentPeriodEnd = command.periodEnd;
      next.status =
        s.status === "pending_activation" || s.status === "active" || s.status === "reactivated"
          ? "active"
          : s.status === "cancellation_scheduled"
            ? "cancellation_scheduled"
            : "reactivated";
      break;
    }
    case "payment_failed":
      requireRule(
        !s.isDemo && ["active", "reactivated", "cancellation_scheduled"].includes(s.status),
        "No active paid subscription",
      );
      next.status = "payment_failed";
      next.cancelAtPeriodEnd = false;
      break;
    case "enter_read_only":
      requireRule(
        !s.isDemo && ["payment_failed", "cancelled"].includes(s.status),
        "Only restricted paid accounts can enter read-only state",
      );
      next.status = "read_only";
      break;
    case "schedule_cancellation":
      requireRule(
        !s.isDemo &&
          ["active", "reactivated"].includes(s.status) &&
          s.currentPeriodEnd !== null &&
          instant(s.currentPeriodEnd) > time,
        "No paid period to cancel",
      );
      next.status = "cancellation_scheduled";
      next.cancelAtPeriodEnd = true;
      break;
    case "reverse_cancellation":
      requireRule(
        s.status === "cancellation_scheduled" &&
          s.currentPeriodEnd !== null &&
          instant(s.currentPeriodEnd) > time,
        "Cancellation can no longer be reversed",
      );
      next.status = "active";
      next.cancelAtPeriodEnd = false;
      break;
    case "expire":
      if (s.isDemo) {
        requireRule(
          s.status === "demo" && s.demoExpiresAt !== null && instant(s.demoExpiresAt) <= time,
          "Demo has not expired",
        );
        next.status = "read_only";
      } else {
        requireRule(
          s.status === "cancellation_scheduled" &&
            s.currentPeriodEnd !== null &&
            instant(s.currentPeriodEnd) <= time,
          "Paid period has not ended",
        );
        next.status = "cancelled";
        next.cancelAtPeriodEnd = false;
      }
      break;
    case "extend_demo":
      requireRule(
        s.isDemo && s.demoExpiresAt !== null && ["demo", "read_only"].includes(s.status),
        "Only demo accounts can be extended",
      );
      requireRule(
        instant(command.newExpiresAt) > time &&
          instant(command.newExpiresAt) > instant(s.demoExpiresAt!),
        "Extension must advance the expiration into the future",
      );
      next.demoExpiresAt = command.newExpiresAt;
      next.status = "demo";
      break;
  }
  return next;
}
