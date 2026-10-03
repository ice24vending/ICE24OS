import "reflect-metadata";

import { parseServiceConfig } from "@ice24/config";
import { startHealthServer, startTelemetry, writeLog } from "@ice24/observability";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Pool } from "pg";
import { processScheduleBatch } from "./processors/scheduling.js";
import { processDomainEvents } from "./processors/domain-events.js";
import { domainEventConsumers } from "./consumers/index.js";
import { processFileScans } from "./processors/files/file-scans.js";
import { scannerFromEnvironment } from "./processors/files/scanner.js";
import { SupabaseScanStorage } from "./processors/files/storage.js";

@Module({})
class WorkerModule {}

const bootstrap = async (): Promise<void> => {
  const config = parseServiceConfig({
    HOST: process.env.HOST,
    NODE_ENV: process.env.NODE_ENV,
    OTEL_ENABLED: process.env.OTEL_ENABLED,
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    PORT: process.env.WORKER_PORT ?? process.env.PORT ?? "3003",
    SERVICE_NAME: "worker",
    SUPABASE_URL: process.env.SUPABASE_URL,
  });
  const telemetry = startTelemetry({
    enabled: config.OTEL_ENABLED,
    endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    environment: config.NODE_ENV,
    serviceName: config.SERVICE_NAME,
  });
  const app = await NestFactory.createApplicationContext(WorkerModule, { logger: false });
  const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, max: 2 })
    : undefined;
  let scheduling = false;
  const timer = setInterval(() => {
    if (!pool || scheduling) return;
    scheduling = true;
    void processScheduleBatch(pool)
      .catch(() => {
        console.error("Schedule worker database unavailable");
      })
      .finally(() => {
        scheduling = false;
      });
  }, 5000);
  let consuming = false;
  const eventsTimer = setInterval(() => {
    if (!pool || consuming) return;
    consuming = true;
    const started = Date.now();
    void processDomainEvents(pool, domainEventConsumers)
      .then((summary) => {
        if (summary.received === 0) return;
        writeLog({
          level: summary.deadLettered > 0 || summary.retried > 0 ? "warn" : "info",
          service: config.SERVICE_NAME,
          environment: config.NODE_ENV,
          module: "domain-events",
          outcome: summary.deadLettered > 0 ? "degraded" : "success",
          durationMs: Date.now() - started,
          attributes: { event: "domain_events_batch", ...summary },
        });
      })
      .catch(() => {
        writeLog({
          level: "error",
          service: config.SERVICE_NAME,
          environment: config.NODE_ENV,
          module: "domain-events",
          outcome: "failure",
          errorCode: "QUEUE_UNAVAILABLE",
        });
      })
      .finally(() => {
        consuming = false;
      });
  }, 2000);
  // F5-09: without an approved scanner and private storage the queue is left untouched, so
  // uploads stay VERIFYING in quarantine instead of exhausting their retries (ADR-019).
  const selection = scannerFromEnvironment(process.env);
  const scanStorage = SupabaseScanStorage.fromEnvironment(process.env);
  const scanDependencies =
    selection.scanner && scanStorage
      ? {
          scanner: selection.scanner,
          storage: scanStorage,
          onSecurityAlert: (alert: { verdict: string; correlationId: string | null }) =>
            writeLog({
              level: "warn",
              service: config.SERVICE_NAME,
              environment: config.NODE_ENV,
              module: "file-scans",
              outcome: "failure",
              errorCode: `FILE_${alert.verdict}`,
              ...(alert.correlationId ? { correlationId: alert.correlationId } : {}),
              attributes: { event: "file_security_alert", ...alert },
            }),
        }
      : undefined;
  if (!scanDependencies)
    writeLog({
      level: "warn",
      service: config.SERVICE_NAME,
      environment: config.NODE_ENV,
      module: "file-scans",
      outcome: "degraded",
      errorCode: selection.scanner ? "STORAGE_NOT_CONFIGURED" : selection.reason,
      attributes: { event: "file_scans_disabled" },
    });
  let scanning = false;
  const scansTimer = setInterval(() => {
    if (!pool || !scanDependencies || scanning) return;
    scanning = true;
    const started = Date.now();
    void processFileScans(pool, scanDependencies)
      .then((summary) => {
        if (summary.received === 0) return;
        writeLog({
          level: summary.deadLettered > 0 || summary.retried > 0 ? "warn" : "info",
          service: config.SERVICE_NAME,
          environment: config.NODE_ENV,
          module: "file-scans",
          outcome: summary.deadLettered > 0 ? "degraded" : "success",
          durationMs: Date.now() - started,
          attributes: {
            event: "file_scans_batch",
            engine: scanDependencies.scanner.engine,
            ...summary,
          },
        });
      })
      .catch(() => {
        writeLog({
          level: "error",
          service: config.SERVICE_NAME,
          environment: config.NODE_ENV,
          module: "file-scans",
          outcome: "failure",
          errorCode: "QUEUE_UNAVAILABLE",
        });
      })
      .finally(() => {
        scanning = false;
      });
  }, 3000);
  const healthServer = await startHealthServer({
    host: config.HOST,
    port: config.PORT,
    probes: [
      () => ({ name: "runtime", status: "ok" }),
      () => ({ name: "telemetry", status: "ok" }),
    ],
    service: config.SERVICE_NAME,
  });
  writeLog({
    level: "info",
    service: config.SERVICE_NAME,
    environment: config.NODE_ENV,
    module: "platform",
    outcome: "success",
    attributes: { event: "service_started", port: config.PORT },
  });

  await new Promise<void>((resolve) => {
    process.once("SIGINT", () => resolve());
    process.once("SIGTERM", () => resolve());
  });
  await new Promise<void>((resolve, reject) => {
    healthServer.close((error) => (error ? reject(error) : resolve()));
  });
  await app.close();
  clearInterval(timer);
  clearInterval(eventsTimer);
  clearInterval(scansTimer);
  await pool?.end();
  await telemetry.shutdown();
};

void bootstrap().catch(() => {
  console.error("Worker startup failed");
  process.exitCode = 1;
});
