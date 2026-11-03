import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { MaintenanceController } from "./scheduling/scheduling.controller.js";
import { MaintenanceStore } from "./scheduling/scheduling.store.js";
@Module({
  imports: [IdentityModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceStore],
})
export class MaintenanceModule {}
