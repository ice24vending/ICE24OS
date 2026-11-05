import { Module, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { InputValidationFilter } from "../common/security/input-validation.filter.js";

import { CorrelationMiddleware, TelemetryMiddleware } from "./correlation.middleware.js";
import { HealthController } from "./health.controller.js";
import { IdentityModule } from "../modules/identity/identity.module.js";
import { EquipmentModule } from "../modules/equipment/equipment.module.js";
import { MaintenanceModule } from "../modules/maintenance/maintenance.module.js";
import { TicketsModule } from "../modules/tickets/tickets.module.js";
import { WorkOrdersModule } from "../modules/work-orders/work-orders.module.js";
import { SubscriptionsModule } from "../modules/subscriptions/subscriptions.module.js";
import { AuditModule } from "../modules/audit/audit.module.js";
import { JobsModule } from "../modules/jobs/jobs.module.js";
import { FilesModule } from "../modules/files/files.module.js";
import { NotificationsModule } from "../modules/notifications/notifications.module.js";
import { IntegrationLogsModule } from "../modules/integration-logs/integration-logs.module.js";

@Module({
  controllers: [HealthController],
  imports: [
    IntegrationLogsModule,
    IdentityModule,
    EquipmentModule,
    MaintenanceModule,
    TicketsModule,
    WorkOrdersModule,
    SubscriptionsModule,
    AuditModule,
    JobsModule,
    FilesModule,
    NotificationsModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: InputValidationFilter }],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware, TelemetryMiddleware).forRoutes("{*path}");
  }
}
