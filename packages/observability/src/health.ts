import { createServer, type Server } from "node:http";

export interface HealthCheckResult {
  readonly name: string;
  readonly status: "ok" | "degraded";
  readonly durationMs?: number;
  readonly reason?: string;
}

export interface HealthReport {
  readonly service: string;
  readonly status: "ok" | "degraded";
  readonly timestamp: string;
  readonly checks: readonly HealthCheckResult[];
}

export type ReadinessProbe = () => HealthCheckResult | Promise<HealthCheckResult>;

export const buildHealthReport = async (
  service: string,
  probes: readonly ReadinessProbe[],
): Promise<HealthReport> => {
  const checks = await Promise.all(
    probes.map(async (probe) => {
      const startedAt = performance.now();
      try {
        const result = await probe();
        return { ...result, durationMs: Math.round(performance.now() - startedAt) };
      } catch {
        return {
          name: "unknown",
          status: "degraded" as const,
          durationMs: Math.round(performance.now() - startedAt),
          reason: "probe_failed",
        };
      }
    }),
  );
  return {
    service,
    status: checks.every((check) => check.status === "ok") ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
  };
};

export const startHealthServer = async (options: {
  readonly host?: string;
  readonly port: number;
  readonly probes?: readonly ReadinessProbe[];
  readonly service: string;
}): Promise<Server> => {
  const server = createServer(async (request, response) => {
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.setHeader("cache-control", "no-store");

    if (request.url === "/health/live") {
      response.statusCode = 200;
      response.end(
        JSON.stringify({
          service: options.service,
          status: "ok",
          timestamp: new Date().toISOString(),
          checks: [{ name: "process", status: "ok" }],
        }),
      );
      return;
    }

    if (request.url === "/health/ready" || request.url === "/health") {
      const report = await buildHealthReport(options.service, options.probes ?? []);
      response.statusCode = report.status === "ok" ? 200 : 503;
      response.end(JSON.stringify(report));
      return;
    }

    response.statusCode = 404;
    response.end(JSON.stringify({ error: "not_found" }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host ?? "127.0.0.1", () => resolve());
  });
  return server;
};
