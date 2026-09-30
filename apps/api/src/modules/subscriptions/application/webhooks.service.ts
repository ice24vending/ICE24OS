import { createHash, randomUUID } from "node:crypto";
import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { SubscriptionGateway } from "./subscription.gateway.js";
import { WebhookPort } from "./webhook.port.js";
import { reconcileSubscription } from "../domain/reconciliation.js";

const supported = new Set([
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
]);

@Injectable()
export class WebhooksService {
  constructor(
    @Inject(SubscriptionGateway) private readonly gateway: SubscriptionGateway,
    @Inject(WebhookPort) private readonly db: WebhookPort,
  ) {}
  async receive(
    rawBody: Uint8Array | undefined,
    signature: string | undefined,
    correlationId: string = randomUUID(),
  ) {
    if (!rawBody || !signature || rawBody.byteLength > 1024 * 1024)
      throw new BadRequestException("Signed raw body is required");
    const event = this.gateway.verifyWebhook({ rawBody, signature });
    const digest = createHash("sha256").update(rawBody).digest("hex");
    // Durable receipt is committed before Stripe I/O; never fire-and-forget after an ACK.
    await this.db.receive(event, digest, correlationId, rawBody);
    try {
      await this.db.process(event.providerEventId, async (tx) => {
        if (!supported.has(tx.event.eventType)) return "IGNORED";
        if (!tx.event.providerSubscriptionId || !tx.event.providerCustomerId) return "IGNORED";
        const previous = await tx.resolveAccount();
        const snapshot = await this.gateway.retrieveSubscription({
          accountId: previous.accountId,
          providerCustomerId: tx.event.providerCustomerId,
          providerSubscriptionId: tx.event.providerSubscriptionId,
          correlationId: tx.correlationId,
        });
        const next = reconcileSubscription(previous, snapshot, tx.now);
        if (next) await tx.save(next, previous);
        return "APPLIED";
      });
    } catch {
      throw new ServiceUnavailableException("Webhook reconciliation pending; retry delivery");
    }
    return { received: true };
  }
}
