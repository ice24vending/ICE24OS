import { Module, type MiddlewareConsumer, type NestModule } from "@nestjs/common";

import { CorrelationMiddleware, TelemetryMiddleware } from "./correlation.middleware.js";
import { HealthController } from "./health.controller.js";

@Module({
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware, TelemetryMiddleware).forRoutes("{*path}");
  }
}
