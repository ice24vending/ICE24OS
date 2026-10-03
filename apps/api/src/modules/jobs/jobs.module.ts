import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { JobsPort } from "./application/jobs.port.js";
import { JobsService } from "./application/jobs.service.js";
import { JobsDatabase } from "./infrastructure/jobs.database.js";
import { JobsController } from "./interface/jobs.controller.js";

@Module({
  imports: [IdentityModule],
  providers: [JobsService, JobsDatabase, { provide: JobsPort, useExisting: JobsDatabase }],
  controllers: [JobsController],
})
export class JobsModule {}
