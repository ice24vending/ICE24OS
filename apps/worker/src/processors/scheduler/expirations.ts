import type { ScheduledTask } from "./engine.js";

export const EXPIRATIONS_TASK = "subscriptions.expirations";

/**
 * Materializes due subscription expirations (PRD RF-SUB-006, RF-SUB-007, RF-SUB-012):
 * an expired demo becomes `read_only` and a scheduled cancellation whose paid period ended
 * becomes `cancelled`. Access is already restricted by clock (`subscriptions.effective_access`),
 * so this task records the state, history, audit and outbox event without changing who can write.
 * Each batch revalidates the previous state under row locks; a retried, concurrent or resumed
 * window finds nothing left to do for the subscriptions already transitioned.
 */
export function expirationsTask(
  options: { batchSize?: number; maxBatches?: number } = {},
): ScheduledTask {
  const batchSize = options.batchSize ?? 100;
  const maxBatches = options.maxBatches ?? 20;
  return {
    name: EXPIRATIONS_TASK,
    schedule: { kind: "interval", everySeconds: 300 },
    // Expirations are instants; the interval aligns to UTC and no local calendar applies.
    timeZone: "UTC",
    catchUpWindows: 1,
    async handle(context) {
      let demosExpired = 0;
      let cancellationsCompleted = 0;
      for (let batch = 0; batch < maxBatches; batch++) {
        const result = await context.pool.query<{ demos: number; cancellations: number }>(
          "select demos, cancellations from subscriptions.expire_due($1,$2)",
          [batchSize, context.correlationId],
        );
        const demos = result.rows[0]?.demos ?? 0;
        const cancellations = result.rows[0]?.cancellations ?? 0;
        demosExpired += demos;
        cancellationsCompleted += cancellations;
        if (demos + cancellations < batchSize) break;
        await context.heartbeat();
      }
      return { demosExpired, cancellationsCompleted };
    },
  };
}
