import "reflect-metadata";

import { parseServiceConfig } from "@ice24/config";
import { API_PREFIX } from "@ice24/contracts";
import { startTelemetry } from "@ice24/observability";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "../src/platform/app.module.js";

type RequestHandler = (request: unknown, response: unknown) => void;

let handlerPromise: Promise<RequestHandler> | undefined;

const createHandler = async (): Promise<RequestHandler> => {
  const config = parseServiceConfig({
    HOST: "127.0.0.1",
    NODE_ENV: process.env.APP_ENV ?? process.env.NODE_ENV,
    OTEL_ENABLED: process.env.OTEL_ENABLED,
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    PORT: "3001",
    SERVICE_NAME: "api",
    SUPABASE_URL: process.env.SUPABASE_URL,
  });
  startTelemetry({
    enabled: config.OTEL_ENABLED,
    endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    environment: config.NODE_ENV,
    serviceName: config.SERVICE_NAME,
  });

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(API_PREFIX.slice(1));
  await app.init();
  return app.getHttpAdapter().getInstance() as RequestHandler;
};

export default async function handler(request: unknown, response: unknown): Promise<void> {
  handlerPromise ??= createHandler();
  const requestHandler = await handlerPromise;
  requestHandler(request, response);
}
