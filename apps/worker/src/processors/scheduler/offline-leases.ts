import type { ScheduledTask } from "./engine.js";
export function offlineLeasesTask(): ScheduledTask {
  return {
    name: "maintenance.offline-lease-expiration",
    schedule: { kind: "interval", everySeconds: 300 },
    timeZone: "UTC",
    catchUpWindows: 1,
    async handle(context) {
      const result = await context.pool.query<{ count: number }>(
        "select maintenance.expire_offline_leases($1,$2) as count",
        [100, context.correlationId],
      );
      return { expired: result.rows[0]?.count ?? 0 };
    },
  };
}
