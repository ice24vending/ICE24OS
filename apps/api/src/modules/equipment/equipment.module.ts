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
import { AccountCatalogStore } from "./account-catalog.store.js";
import { AccountCatalogController } from "./account-catalog.controller.js";
import { MachineComponentsStore } from "./machine-components.store.js";
import { MachineComponentsController } from "./machine-components.controller.js";

@Module({
  imports: [IdentityModule],
  controllers: [
    EquipmentController,
    EquipmentAdminController,
    AccountCatalogController,
    MachineComponentsController,
  ],
  providers: [
    EquipmentDatabase,
    AccountsStore,
    TemplatesStore,
    RequestsStore,
    MachinesStore,
    TransfersStore,
    FilesStore,
    MembersStore,
    AccountCatalogStore,
    MachineComponentsStore,
  ],
})
export class EquipmentModule {}
