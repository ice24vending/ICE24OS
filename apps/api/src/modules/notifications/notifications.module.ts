import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { EMAIL_WEBHOOK_VERIFIER, EmailTrackingPort } from "./application/email-tracking.port.js";
import { EmailWebhooksService } from "./application/email-webhooks.service.js";
import { NotificationsPort } from "./application/notifications.port.js";
import { NotificationsService } from "./application/notifications.service.js";
import { EmailTrackingDatabase } from "./infrastructure/email-tracking.database.js";
import { emailWebhookVerifierFromEnvironment } from "./infrastructure/local-email-webhook.verifier.js";
import { NotificationsDatabase } from "./infrastructure/notifications.database.js";
import { EmailWebhooksController } from "./interface/email-webhooks.controller.js";
import { NotificationsController } from "./interface/notifications.controller.js";

@Module({
  imports: [IdentityModule],
  providers: [
    NotificationsService,
    NotificationsDatabase,
    { provide: NotificationsPort, useExisting: NotificationsDatabase },
    EmailWebhooksService,
    EmailTrackingDatabase,
    { provide: EmailTrackingPort, useExisting: EmailTrackingDatabase },
    {
      provide: EMAIL_WEBHOOK_VERIFIER,
      useFactory: () => emailWebhookVerifierFromEnvironment(process.env),
    },
  ],
  controllers: [NotificationsController, EmailWebhooksController],
})
export class NotificationsModule {}
