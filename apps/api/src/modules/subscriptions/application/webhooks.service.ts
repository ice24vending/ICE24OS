import { createHash, randomUUID } from "node:crypto";
import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { IntegrationTracer } from "@ice24/observability";
import {
  INTEGRATION_TRACER,
  metricsOnlyTracer,
} from "../../../common/integrations/integration-tracer.js";
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
    @Optional()
    @Inject(INTEGRATION_TRACER)
    private readonly tracer: IntegrationTracer = metricsOnlyTracer(),
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
    const started = performance.now();
    // Durable receipt is committed before Stripe I/O; never fire-and-forget after an ACK.
    // F5-14: a Checkout session event resumes the correlation of the request that created it.
    const receipt = await this.db.receive(
      event,
      digest,
      event.originCorrelationId ?? correlationId,
      rawBody,
    );
    let accountId: string | null = null;
    const inbound = (failed: boolean) =>
      this.tracer.record({
        integration: "stripe",
        direction: "INBOUND",
        operation: "webhook.receive",
        provider: "stripe",
        effectKey: event.providerEventId,
        details: { eventType: event.eventType },
        context: {
          correlationId: receipt.correlationId,
          requestCorrelationId: correlationId,
          attempt: receipt.deliveries,
          accountId,
        },
        status: failed ? "FAILED" : "SUCCEEDED",
        latencyMs: performance.now() - started,
        responseCode: failed ? 503 : 200,
        errorCode: failed ? "WEBHOOK_PROCESSING_FAILED" : null,
        retryable: failed ? true : null,
      });
    try {
      await this.db.process(event.providerEventId, async (tx) => {
        if (!supported.has(tx.event.eventType)) return "IGNORED";
        if (!tx.event.providerSubscriptionId || !tx.event.providerCustomerId) return "IGNORED";
        const previous = await tx.resolveAccount();
        accountId = previous.accountId;
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
      await inbound(true);
      throw new ServiceUnavailableException("Webhook reconciliation pending; retry delivery");
    }
    await inbound(false);
    return { received: true };
  }
}
