import { Module } from "@nestjs/common";
import type { IntegrationTracer } from "@ice24/observability";
import { INTEGRATION_TRACER } from "../../common/integrations/integration-tracer.js";
import { IdentityModule } from "../identity/identity.module.js";
import { SubscriptionDatabase } from "./infrastructure/subscription.database.js";
import { SubscriptionsService } from "./application/subscriptions.service.js";
import { SubscriptionsController } from "./interface/subscriptions.controller.js";
import { SubscriptionPort } from "./application/subscription.port.js";
import { SubscriptionGateway } from "./application/subscription.gateway.js";
import { StripeSubscriptionGateway } from "./infrastructure/stripe.gateway.js";
import { BillingService } from "./application/billing.service.js";
import { BillingController } from "./interface/billing.controller.js";
import { WebhookPort } from "./application/webhook.port.js";
import { WebhooksService } from "./application/webhooks.service.js";
import { WebhookDatabase } from "./infrastructure/webhook.database.js";
import { WebhooksController } from "./interface/webhooks.controller.js";

@Module({
  imports: [IdentityModule],
  providers: [
    SubscriptionDatabase,
    { provide: SubscriptionPort, useExisting: SubscriptionDatabase },
    SubscriptionsService,
    BillingService,
    WebhooksService,
    WebhookDatabase,
    { provide: WebhookPort, useExisting: WebhookDatabase },
    {
      provide: SubscriptionGateway,
      inject: [INTEGRATION_TRACER],
      useFactory: (tracer: IntegrationTracer) =>
        new StripeSubscriptionGateway(process.env, undefined, tracer),
    },
  ],
  controllers: [SubscriptionsController, BillingController, WebhooksController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
