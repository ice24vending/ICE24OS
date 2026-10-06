import type { ScheduledTask } from "./engine.js";
import { expirationsTask } from "./expirations.js";
import { reconciliationTask, type SubscriptionObservationSource } from "./reconciliation.js";
import { reportPeriodTasks } from "./reports.js";

export interface ScheduledTaskDependencies {
  /** Provider observations for Stripe reconciliation; null keeps the task out of the registry. */
  readonly observations: SubscriptionObservationSource | null;
}

/**
 * Declarative registry of scheduled tasks: name, schedule (cron or interval), explicit time
 * zone, catch-up limit and handler. Names are part of window idempotency keys: never rename a
 * task that already ran. To stop a task in operation, pause it (`infra.scheduler_set_paused`)
 * instead of removing it from this list.
 */
export function scheduledTasks(dependencies: ScheduledTaskDependencies): ScheduledTask[] {
  return [
    expirationsTask(),
    ...reportPeriodTasks(),
    ...(dependencies.observations ? [reconciliationTask(dependencies.observations)] : []),
  ];
}

export type ObservationSourceSelection =
  | { readonly source: SubscriptionObservationSource }
  | { readonly source: null; readonly reason: string };

/**
 * Stripe reconciliation needs the F5-02 adapter, whose remote validation with Stripe test is
 * still pending (F5-02 AC-10). No source is selected from the environment until then, so the
 * worker logs the reason and runs the other tasks. Tests inject the fake source directly.
 */
export function observationSourceFromEnvironment(
  env: NodeJS.ProcessEnv,
): ObservationSourceSelection {
  return {
    source: null,
    reason: env.STRIPE_SECRET_KEY
      ? "STRIPE_RECONCILIATION_PENDING_VALIDATION"
      : "STRIPE_RECONCILIATION_NOT_CONFIGURED",
  };
}
