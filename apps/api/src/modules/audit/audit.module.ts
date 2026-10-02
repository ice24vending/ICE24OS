import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { AuditPort } from "./application/audit.port.js";
import { AuditService } from "./application/audit.service.js";
import { AuditDatabase } from "./infrastructure/audit.database.js";
import { AuditController } from "./interface/audit.controller.js";

@Module({
  imports: [IdentityModule],
  providers: [AuditService, AuditDatabase, { provide: AuditPort, useExisting: AuditDatabase }],
  controllers: [AuditController],
})
export class AuditModule {}
