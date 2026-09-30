import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { SubscriptionDatabase } from "./infrastructure/subscription.database.js";
import { SubscriptionsService } from "./application/subscriptions.service.js";
import { SubscriptionsController } from "./interface/subscriptions.controller.js";
import { SubscriptionPort } from "./application/subscription.port.js";
import { SubscriptionGateway } from "./application/subscription.gateway.js";
import { StripeSubscriptionGateway } from "./infrastructure/stripe.gateway.js";
import { BillingService } from "./application/billing.service.js";
import { BillingController } from "./interface/billing.controller.js";

@Module({
  imports: [IdentityModule],
  providers: [
    SubscriptionDatabase,
    { provide: SubscriptionPort, useExisting: SubscriptionDatabase },
    SubscriptionsService,
    BillingService,
    { provide: SubscriptionGateway, useFactory: () => new StripeSubscriptionGateway() },
  ],
  controllers: [SubscriptionsController, BillingController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
