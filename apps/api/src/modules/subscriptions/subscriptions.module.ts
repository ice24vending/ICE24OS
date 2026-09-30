import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { SubscriptionDatabase } from "./infrastructure/subscription.database.js";
import { SubscriptionsService } from "./application/subscriptions.service.js";
import { SubscriptionsController } from "./interface/subscriptions.controller.js";
import { SubscriptionPort } from "./application/subscription.port.js";

@Module({
  imports: [IdentityModule],
  providers: [
    SubscriptionDatabase,
    { provide: SubscriptionPort, useExisting: SubscriptionDatabase },
    SubscriptionsService,
  ],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
