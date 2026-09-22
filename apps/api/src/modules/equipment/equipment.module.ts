import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { EquipmentDatabase } from "./equipment.database.js";
import { AccountsStore } from "./accounts.store.js";
import { TemplatesStore } from "./templates.store.js";
import { RequestsStore } from "./requests.store.js";
import { MachinesStore } from "./machines.store.js";
import { TransfersStore } from "./transfers.store.js";
import { FilesStore } from "./files.store.js";
import { MembersStore } from "./members.store.js";
import { EquipmentController } from "./equipment.controller.js";
import { EquipmentAdminController } from "./equipment-admin.controller.js";

@Module({
  imports: [IdentityModule],
  controllers: [EquipmentController, EquipmentAdminController],
  providers: [
    EquipmentDatabase,
    AccountsStore,
    TemplatesStore,
    RequestsStore,
    MachinesStore,
    TransfersStore,
    FilesStore,
    MembersStore,
  ],
})
export class EquipmentModule {}
