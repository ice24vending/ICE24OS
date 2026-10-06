import type { ScheduledTask } from "./engine.js";

export const INTEGRATION_LOG_RETENTION_TASK = "observability.integration-log-retention";

/**
 * RF-AUD-008 / RNF-PER-005: technical logs have a configurable retention. No period is assumed
 * (PRD question 92, DEC-008): `INTEGRATION_LOG_RETENTION_DAYS` must be an integer from 1 to
 * 3650, provisioned by `infra/terraform/modules/observability`; otherwise nothing is purged.
 */
export function integrationLogRetentionFromEnvironment(env: NodeJS.ProcessEnv): number | null {
  const raw = env.INTEGRATION_LOG_RETENTION_DAYS?.trim();
  if (!raw || !/^\d{1,4}$/u.test(raw)) return null;
  const days = Number(raw);
  return days >= 1 && days <= 3650 ? days : null;
}

/**
 * Daily purge of integration logs older than the configured period, in bounded batches. A
 * retried or concurrent window only deletes what is still older than the period.
 */
export function integrationLogRetentionTask(
  retentionDays: number,
  options: { batchSize?: number; maxBatches?: number } = {},
): ScheduledTask {
  const batchSize = options.batchSize ?? 5000;
  const maxBatches = options.maxBatches ?? 20;
  return {
    name: INTEGRATION_LOG_RETENTION_TASK,
    schedule: { kind: "cron", expression: "30 4 * * *" },
    timeZone: "America/Mexico_City",
    catchUpWindows: 1,
    async handle(context) {
      let purged = 0;
      for (let batch = 0; batch < maxBatches; batch++) {
        const result = await context.pool.query<{ removed: number }>(
          "select infra.purge_integration_logs($1,$2) as removed",
          [retentionDays, batchSize],
        );
        const removed = result.rows[0]?.removed ?? 0;
        purged += removed;
        if (removed < batchSize) break;
        await context.heartbeat();
      }
      return { purged, retentionDays };
    },
  };
}
