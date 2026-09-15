import { Module, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { InputValidationFilter } from "../common/security/input-validation.filter.js";

import { CorrelationMiddleware, TelemetryMiddleware } from "./correlation.middleware.js";
import { HealthController } from "./health.controller.js";
import { IdentityModule } from "../modules/identity/identity.module.js";

@Module({
  controllers: [HealthController],
  imports: [IdentityModule],
  providers: [{ provide: APP_FILTER, useClass: InputValidationFilter }],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware, TelemetryMiddleware).forRoutes("{*path}");
  }
}
