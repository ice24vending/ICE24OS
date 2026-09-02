import "reflect-metadata";

import { parseServiceConfig } from "@ice24/config";
import { API_PREFIX } from "@ice24/contracts";
import { startTelemetry, writeLog } from "@ice24/observability";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./platform/app.module.js";

const bootstrap = async (): Promise<void> => {
  const config = parseServiceConfig({
    HOST: process.env.HOST,
    NODE_ENV: process.env.NODE_ENV,
    OTEL_ENABLED: process.env.OTEL_ENABLED,
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    PORT: process.env.API_PORT ?? "3001",
    SERVICE_NAME: "api",
    SUPABASE_URL: process.env.SUPABASE_URL,
  });
  const telemetry = startTelemetry({
    enabled: config.OTEL_ENABLED,
    endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    environment: config.NODE_ENV,
    serviceName: config.SERVICE_NAME,
  });
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_PREFIX.slice(1));

  const openApiConfig = new DocumentBuilder()
    .setTitle("ICE24 OS API")
    .setDescription("ICE24 OS platform and Phase 3 identity/authorization contracts.")
    .setVersion("1.0.0")
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup(`${API_PREFIX.slice(1)}/docs`, app, document);

  app.enableShutdownHooks();
  await app.listen(config.PORT, config.HOST);
  writeLog({
    environment: config.NODE_ENV,
    level: "info",
    module: "platform",
    outcome: "success",
    service: config.SERVICE_NAME,
    attributes: { event: "service_started", port: config.PORT },
  });

  process.once("beforeExit", () => {
    void telemetry.shutdown();
  });
};

void bootstrap().catch((error: unknown) => {
  console.error("API startup failed", error);
  process.exitCode = 1;
});
