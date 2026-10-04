import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { NotificationsPort } from "./application/notifications.port.js";
import { NotificationsService } from "./application/notifications.service.js";
import { NotificationsDatabase } from "./infrastructure/notifications.database.js";
import { NotificationsController } from "./interface/notifications.controller.js";

@Module({
  imports: [IdentityModule],
  providers: [
    NotificationsService,
    NotificationsDatabase,
    { provide: NotificationsPort, useExisting: NotificationsDatabase },
  ],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
