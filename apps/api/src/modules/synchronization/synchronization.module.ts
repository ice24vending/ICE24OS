import { OfflinePurgeController } from "./offline-purge.controller.js";
import { Module } from "@nestjs/common";
import { WorkOrdersModule } from "../work-orders/work-orders.module.js";
import { IdentityModule } from "../identity/identity.module.js";
import { SynchronizationController } from "./synchronization.controller.js";
@Module({
  imports: [IdentityModule, WorkOrdersModule],
  controllers: [SynchronizationController, OfflinePurgeController],
})
export class SynchronizationModule {}
