import { Module, type MiddlewareConsumer, type NestModule } from "@nestjs/common";

import { CorrelationMiddleware, TelemetryMiddleware } from "./correlation.middleware.js";
import { HealthController } from "./health.controller.js";
import { IdentityModule } from "../modules/identity/identity.module.js";

@Module({
  controllers: [HealthController],
  imports: [IdentityModule],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware, TelemetryMiddleware).forRoutes("{*path}");
  }
}
