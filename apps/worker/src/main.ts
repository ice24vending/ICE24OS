import "reflect-metadata";

import { parseServiceConfig } from "@ice24/config";
import { createLogRecord } from "@ice24/observability";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

@Module({})
class WorkerModule {}

const bootstrap = async (): Promise<void> => {
  const config = parseServiceConfig({
    NODE_ENV: process.env.NODE_ENV,
    PORT: "3003",
    SERVICE_NAME: "worker",
  });
  const app = await NestFactory.createApplicationContext(WorkerModule, { logger: false });
  console.info(
    JSON.stringify(
      createLogRecord({
        level: "info",
        service: config.SERVICE_NAME,
        environment: config.NODE_ENV,
        module: "platform",
        outcome: "success",
      }),
    ),
  );
  await app.close();
};

void bootstrap().catch((error: unknown) => {
  console.error("Worker startup failed", error);
  process.exitCode = 1;
});
