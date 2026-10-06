import { createIntegrationTracer } from "@ice24/observability";
import { Global, Module } from "@nestjs/common";
import { INTEGRATION_TRACER } from "../../common/integrations/integration-tracer.js";
import { IdentityModule } from "../identity/identity.module.js";
import { IntegrationLogsPort } from "./application/integration-logs.port.js";
import { IntegrationLogsService } from "./application/integration-logs.service.js";
import { IntegrationLogsDatabase } from "./infrastructure/integration-logs.database.js";
import { IntegrationLogsController } from "./interface/integration-logs.controller.js";

/**
 * F5-14. Global so Stripe, object storage and email tracking adapters record through the same
 * tracer; without DATABASE_URL the tracer keeps metrics and failure logs only.
 */
@Global()
@Module({
  imports: [IdentityModule],
  providers: [
    IntegrationLogsService,
    IntegrationLogsDatabase,
    { provide: IntegrationLogsPort, useExisting: IntegrationLogsDatabase },
    {
      provide: INTEGRATION_TRACER,
      inject: [IntegrationLogsDatabase],
      useFactory: (database: IntegrationLogsDatabase) =>
        createIntegrationTracer({
          service: "api",
          environment: process.env.NODE_ENV ?? "development",
          sink: process.env.DATABASE_URL ? database : null,
        }),
    },
  ],
  controllers: [IntegrationLogsController],
  exports: [INTEGRATION_TRACER],
})
export class IntegrationLogsModule {}
