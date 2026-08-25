import "reflect-metadata";

import { parseServiceConfig } from "@ice24/config";
import { API_PREFIX } from "@ice24/contracts";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./platform/app.module.js";

const bootstrap = async (): Promise<void> => {
  const config = parseServiceConfig({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.API_PORT ?? "3001",
    SERVICE_NAME: "api",
  });
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_PREFIX.slice(1));

  const openApiConfig = new DocumentBuilder()
    .setTitle("ICE24 OS API")
    .setDescription("Initial platform contract. Business modules are introduced by later phases.")
    .setVersion("1.0.0")
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup(`${API_PREFIX.slice(1)}/docs`, app, document);

  await app.listen(config.PORT, "127.0.0.1");
};

void bootstrap().catch((error: unknown) => {
  console.error("API startup failed", error);
  process.exitCode = 1;
});
