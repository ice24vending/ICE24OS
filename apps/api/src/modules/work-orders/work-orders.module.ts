import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { WorkOrdersController } from "./interface/work-orders.controller.js";
import { WorkOrdersStore } from "./infrastructure/work-orders.store.js";
@Module({
  imports: [IdentityModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersStore],
})
export class WorkOrdersModule {}
