import type { ReconciliationFindingKind } from "@ice24/contracts";
import { ScheduledTaskFailure, type ScheduledTask } from "./engine.js";

export const RECONCILIATION_TASK = "subscriptions.stripe-reconciliation";

/** Provider facts about one subscription, shaped like the F5-02 `ProviderSubscriptionSnapshot`. */
export interface ProviderSubscriptionObservation {
  /** `metadata.ice24AccountId` of the provider subscription. */
  readonly accountId: string;
  readonly providerCustomerId: string;
  readonly providerSubscriptionId: string;
  readonly providerStatus: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly currentPeriodStart: string | null;
  readonly currentPeriodEnd: string | null;
  readonly cancelAtPeriodEnd: boolean;
}

export interface SubscriptionReference {
  readonly accountId: string;
  readonly providerCustomerId: string;
  readonly providerSubscriptionId: string;
}

/** Thrown by a source when the provider cannot answer now; the window retries with backoff. */
export class ObservationUnavailableError extends Error {
  public constructor() {
    super("STRIPE_UNAVAILABLE");
    this.name = "ObservationUnavailableError";
  }
}

/**
 * Read-only port to the provider. `observe` returns null when the provider does not know the
 * subscription. The Stripe implementation is the F5-02 adapter (`StripeSubscriptionGateway`),
 * pending remote validation; until then only the fake below exists and the task is not
 * registered in the worker (see `reconciliationTask`).
 */
export interface SubscriptionObservationSource {
  /** Recorded with every finding: `stripe` or `fake-stripe`. */
  readonly name: string;
  observe(reference: SubscriptionReference): Promise<ProviderSubscriptionObservation | null>;
}

/** Test double: deterministic observations keyed by provider subscription id. */
export class FakeSubscriptionObservationSource implements SubscriptionObservationSource {
  public readonly name = "fake-stripe";
  private readonly observations = new Map<string, ProviderSubscriptionObservation>();
  private failures = 0;
  public calls = 0;

  public set(observation: ProviderSubscriptionObservation): void {
    this.observations.set(observation.providerSubscriptionId, observation);
  }
  public remove(providerSubscriptionId: string): void {
    this.observations.delete(providerSubscriptionId);
  }
  /** The next `count` calls fail as if the provider were unavailable. */
  public failNext(count: number): void {
    this.failures = count;
  }
  public observe(
    reference: SubscriptionReference,
  ): Promise<ProviderSubscriptionObservation | null> {
    this.calls += 1;
    if (this.failures > 0) {
      this.failures -= 1;
      return Promise.reject(new ObservationUnavailableError());
    }
    return Promise.resolve(this.observations.get(reference.providerSubscriptionId) ?? null);
  }
}

export interface LocalSubscription {
  readonly accountId: string;
  readonly providerCustomerId: string;
  readonly status: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly currentPeriodEnd: string | null;
  readonly cancelAtPeriodEnd: boolean;
}

export interface ReconciliationFinding {
  readonly kind: ReconciliationFindingKind;
  readonly local: Record<string, unknown>;
  readonly remote: Record<string, unknown> | null;
}

/**
 * Provider statuses consistent with each local status. `cancellation_scheduled` accepts
 * `canceled` because ADR-024 keeps an already paid period after an immediate provider
 * cancellation; pending activation is consistent while the first invoice is open.
 */
const CONSISTENT_STATUSES: Record<string, readonly string[]> = {
  pending_activation: ["incomplete", "incomplete_expired"],
  active: ["active"],
  reactivated: ["active"],
  cancellation_scheduled: ["active", "canceled"],
  payment_failed: ["past_due", "unpaid"],
  read_only: ["past_due", "unpaid", "canceled", "incomplete_expired"],
  cancelled: ["canceled", "incomplete_expired"],
};

const PAID = ["active", "reactivated", "cancellation_scheduled"];

/** Differences between local state and the provider. Never decides a correction. */
export function compareSubscription(
  local: LocalSubscription,
  remote: ProviderSubscriptionObservation | null,
): ReconciliationFinding[] {
  const localValue = {
    status: local.status,
    currentPeriodEnd: local.currentPeriodEnd,
    cancelAtPeriodEnd: local.cancelAtPeriodEnd,
    amountMinor: local.amountMinor,
    currency: local.currency,
  };
  if (remote === null) return [{ kind: "REMOTE_NOT_FOUND", local: localValue, remote: null }];
  const remoteValue = {
    status: remote.providerStatus,
    currentPeriodEnd: remote.currentPeriodEnd,
    cancelAtPeriodEnd: remote.cancelAtPeriodEnd,
    amountMinor: remote.amountMinor,
    currency: remote.currency.toUpperCase(),
  };
  const finding = (kind: ReconciliationFindingKind): ReconciliationFinding => ({
    kind,
    local: localValue,
    remote: remoteValue,
  });
  // A subscription of another account or customer is never compared field by field.
  if (
    remote.accountId !== local.accountId ||
    remote.providerCustomerId !== local.providerCustomerId
  )
    return [finding("OWNERSHIP_MISMATCH")];
  const findings: ReconciliationFinding[] = [];
  if (!(CONSISTENT_STATUSES[local.status] ?? []).includes(remote.providerStatus))
    findings.push(finding("STATUS_MISMATCH"));
  if (remote.providerStatus === "active" && PAID.includes(local.status)) {
    const expectsCancellation = local.status === "cancellation_scheduled";
    if (remote.cancelAtPeriodEnd !== expectsCancellation)
      findings.push(finding("CANCELLATION_MISMATCH"));
    const localEnd = local.currentPeriodEnd === null ? NaN : Date.parse(local.currentPeriodEnd);
    const remoteEnd = remote.currentPeriodEnd === null ? NaN : Date.parse(remote.currentPeriodEnd);
    if (!(Math.abs(localEnd - remoteEnd) < 1000)) findings.push(finding("PERIOD_MISMATCH"));
  }
  if (remote.amountMinor !== local.amountMinor || remote.currency.toUpperCase() !== local.currency)
    findings.push(finding("PRICE_MISMATCH"));
  return findings;
}

interface Candidate {
  subscription_id: string;
  account_id: string;
  provider_customer_id: string;
  provider_subscription_id: string;
  status: string;
  amount_minor: string;
  currency: string;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
}

/**
 * Compares paid subscriptions with the provider once a day (least recently checked first,
 * bounded per window) and records findings in `subscriptions.reconciliation_findings`. It never
 * changes a subscription: verified webhooks remain the only path that applies provider state
 * (ADR-024). A provider outage fails the window with STRIPE_UNAVAILABLE; the retry resumes with
 * the subscriptions not yet checked in that window.
 */
export function reconciliationTask(
  source: SubscriptionObservationSource,
  options: { batchSize?: number; maxPerWindow?: number } = {},
): ScheduledTask {
  const batchSize = options.batchSize ?? 25;
  const maxPerWindow = options.maxPerWindow ?? 200;
  return {
    name: RECONCILIATION_TASK,
    schedule: { kind: "cron", expression: "0 3 * * *" },
    timeZone: "America/Mexico_City",
    catchUpWindows: 1,
    async handle(context) {
      let checked = 0;
      let discrepant = 0;
      let findings = 0;
      while (checked < maxPerWindow) {
        const candidates = await context.pool.query<Candidate>(
          "select * from subscriptions.reconciliation_candidates($1,$2)",
          [context.windowId, Math.min(batchSize, maxPerWindow - checked)],
        );
        if (candidates.rows.length === 0) break;
        for (const candidate of candidates.rows) {
          let remote: ProviderSubscriptionObservation | null;
          try {
            remote = await source.observe({
              accountId: candidate.account_id,
              providerCustomerId: candidate.provider_customer_id,
              providerSubscriptionId: candidate.provider_subscription_id,
            });
          } catch (error) {
            throw new ScheduledTaskFailure(
              error instanceof ObservationUnavailableError
                ? "STRIPE_UNAVAILABLE"
                : "STRIPE_OBSERVATION_FAILED",
            );
          }
          const differences = compareSubscription(
            {
              accountId: candidate.account_id,
              providerCustomerId: candidate.provider_customer_id,
              status: candidate.status,
              amountMinor: Number(candidate.amount_minor),
              currency: candidate.currency,
              currentPeriodEnd: candidate.current_period_end?.toISOString() ?? null,
              cancelAtPeriodEnd: candidate.cancel_at_period_end,
            },
            remote,
          );
          const recorded = await context.pool.query<{ inserted: number }>(
            "select subscriptions.record_reconciliation($1,$2,$3,$4) as inserted",
            [context.windowId, candidate.subscription_id, source.name, JSON.stringify(differences)],
          );
          checked += 1;
          if (differences.length > 0) discrepant += 1;
          findings += recorded.rows[0]?.inserted ?? 0;
        }
        await context.heartbeat();
      }
      return { checked, consistent: checked - discrepant, discrepant, findings };
    },
  };
}
