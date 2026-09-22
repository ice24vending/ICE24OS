import "reflect-metadata";

import { parseServiceConfig } from "@ice24/config";
import { startHealthServer, startTelemetry, writeLog } from "@ice24/observability";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Pool } from "pg";
import { processScheduleBatch } from "./processors/scheduling.js";

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
  await pool?.end();
  await telemetry.shutdown();
};

void bootstrap().catch(() => {
  console.error("Worker startup failed");
  process.exitCode = 1;
});
