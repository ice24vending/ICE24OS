import Stripe from "stripe";
import { parseStripeConfig, type StripeConfig } from "@ice24/config";
import { isCorrelationId, type IntegrationTracer } from "@ice24/observability";
import { metricsOnlyTracer } from "../../../common/integrations/integration-tracer.js";
import {
  SubscriptionGateway,
  SubscriptionGatewayError,
  type CheckoutSessionInput,
  type PortalSessionInput,
  type ProviderSubscriptionReference,
  type ProviderSubscriptionSnapshot,
  type GatewayContext,
  type GatewayMutationContext,
  type VerifiedSubscriptionEvent,
} from "../application/subscription.gateway.js";
import { createStripeClient } from "./stripe.client.js";

export class StripeSubscriptionGateway extends SubscriptionGateway {
  private client: Stripe | undefined;
  private config?: StripeConfig;
  constructor(
    private readonly environment: unknown = process.env,
    client?: Stripe,
    private readonly tracer: IntegrationTracer = metricsOnlyTracer(),
  ) {
    super();
    this.client = client;
  }
  private settings() {
    try {
      this.config ??= parseStripeConfig(this.environment);
      this.client ??= createStripeClient(this.environment);
      return { config: this.config, stripe: this.client };
    } catch {
      throw new SubscriptionGatewayError("DEPENDENCY_UNAVAILABLE", false);
    }
  }
  private static translate(error: unknown): SubscriptionGatewayError {
    if (error instanceof SubscriptionGatewayError) return error;
    if (error instanceof Stripe.errors.StripeIdempotencyError)
      return new SubscriptionGatewayError("IDEMPOTENCY_CONFLICT", false);
    return new SubscriptionGatewayError("DEPENDENCY_UNAVAILABLE", true);
  }
  /**
   * F5-14: every gateway operation is one `stripe` integration log with the account and
   * correlation of the caller and, for mutations, the idempotency key as effect key. The
   * provider status or error code is recorded; messages, payloads and URLs never are.
   */
  private async call<T>(
    operation: string,
    input: GatewayContext & { readonly idempotencyKey?: string },
    work: () => Promise<T>,
  ): Promise<T> {
    try {
      return await this.tracer.trace(
        {
          integration: "stripe",
          operation,
          provider: "stripe",
          effectKey: input.idempotencyKey ?? null,
          context: { correlationId: input.correlationId, accountId: input.accountId },
          onSuccess: () => ({ responseCode: "200" }),
          onError: (error) => {
            const translated = StripeSubscriptionGateway.translate(error);
            const raw = error instanceof Stripe.errors.StripeError ? error : null;
            return {
              errorCode: translated.code,
              retryable: translated.retryable,
              responseCode: raw?.statusCode ?? raw?.code ?? null,
            };
          },
        },
        work,
      );
    } catch (error) {
      throw StripeSubscriptionGateway.translate(error);
    }
  }
  private async customer(id: string, accountId: string, options?: Stripe.RequestOptions) {
    const { stripe } = this.settings();
    const customer = await stripe.customers.retrieve(id, {}, options);
    if (
      customer.deleted ||
      !("metadata" in customer) ||
      customer.metadata.ice24AccountId !== accountId
    )
      throw new SubscriptionGatewayError("STATE_TRANSITION_INVALID", false);
    return customer;
  }
  override createCheckoutSession(input: CheckoutSessionInput) {
    return this.call("checkout.session.create", input, async () => {
      const { stripe, config } = this.settings();
      const price = await stripe.prices.retrieve(input.providerPriceId);
      if (
        !price.active ||
        price.currency !== "mxn" ||
        price.unit_amount !== input.expectedAmountMinor ||
        price.recurring?.interval !== "month" ||
        price.recurring.interval_count !== 1 ||
        price.recurring.usage_type !== "licensed" ||
        price.livemode !== (config.NODE_ENV === "production")
      )
        throw new SubscriptionGatewayError("STATE_TRANSITION_INVALID", false);
      const customer = input.providerCustomerId
        ? await this.customer(input.providerCustomerId, input.accountId)
        : await stripe.customers.create(
            { metadata: { ice24AccountId: input.accountId } },
            { idempotencyKey: `customer:${input.accountId}` },
          );
      const existing = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 100,
      });
      if (
        existing.has_more ||
        existing.data.some((s) => !["canceled", "incomplete_expired"].includes(s.status))
      )
        throw new SubscriptionGatewayError("STATE_TRANSITION_INVALID", false);
      const session = await stripe.checkout.sessions.create(
        {
          mode: "subscription",
          customer: customer.id,
          line_items: [{ price: input.providerPriceId, quantity: 1 }],
          client_reference_id: input.accountId,
          // The session webhook resumes this correlation (verifyWebhook). Not copied to the
          // subscription: later renewals are not part of this request.
          metadata: { ice24AccountId: input.accountId, ice24CorrelationId: input.correlationId },
          subscription_data: { metadata: { ice24AccountId: input.accountId } },
          success_url: input.returnUrl,
          cancel_url: input.cancelUrl,
        },
        { idempotencyKey: input.idempotencyKey },
      );
      if (!session.url) throw new SubscriptionGatewayError("STATE_TRANSITION_INVALID", false);
      return {
        providerSessionId: session.id,
        providerCustomerId: customer.id,
        url: session.url,
        expiresAt: new Date(session.expires_at * 1000).toISOString(),
      };
    });
  }
  override createPortalSession(input: PortalSessionInput) {
    return this.call("portal.session.create", input, async () => {
      const { stripe, config } = this.settings();
      await this.customer(input.providerCustomerId, input.accountId);
      const session = await stripe.billingPortal.sessions.create(
        {
          customer: input.providerCustomerId,
          return_url: input.returnUrl,
          ...(config.STRIPE_PORTAL_CONFIGURATION_ID
            ? { configuration: config.STRIPE_PORTAL_CONFIGURATION_ID }
            : {}),
        },
        { idempotencyKey: input.idempotencyKey },
      );
      return { providerSessionId: session.id, url: session.url, expiresAt: null };
    });
  }
  private async snapshot(
    input: ProviderSubscriptionReference,
  ): Promise<ProviderSubscriptionSnapshot> {
    const { stripe, config } = this.settings();
    const options = { timeout: 3000, maxNetworkRetries: 0 };
    await this.customer(input.providerCustomerId, input.accountId, options);
    const subscription = await stripe.subscriptions.retrieve(
      input.providerSubscriptionId,
      {
        expand: ["latest_invoice"],
      },
      options,
    );
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const item = subscription.items.data[0];
    if (
      customerId !== input.providerCustomerId ||
      subscription.metadata.ice24AccountId !== input.accountId ||
      !item ||
      subscription.items.data.length !== 1 ||
      subscription.items.has_more ||
      item.quantity !== 1 ||
      item.price.unit_amount === null ||
      item.price.recurring?.interval !== "month" ||
      item.price.recurring.interval_count !== 1 ||
      subscription.livemode !== (config.NODE_ENV === "production")
    )
      throw new SubscriptionGatewayError("STATE_TRANSITION_INVALID", false);
    const invoice =
      typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null;
    const covered = invoice?.lines.data.some(
      (line) =>
        line.parent?.subscription_item_details?.subscription_item === item.id &&
        line.period.start <= item.current_period_start &&
        line.period.end >= item.current_period_end,
    );
    const paymentStatus =
      invoice?.status === "paid" && covered
        ? "paid"
        : invoice?.status === "uncollectible" ||
            (invoice?.status === "open" && invoice.attempt_count > 0)
          ? "failed"
          : invoice?.status === "open" || invoice?.status === "draft"
            ? "pending"
            : "unknown";
    return {
      ...input,
      providerStatus: subscription.status,
      providerPriceId: item.price.id,
      amountMinor: item.price.unit_amount ?? 0,
      currency: item.price.currency,
      currentPeriodStart: new Date(item.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(item.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      latestInvoiceId:
        typeof subscription.latest_invoice === "string"
          ? subscription.latest_invoice
          : (invoice?.id ?? null),
      paymentStatus,
      observedAt: new Date().toISOString(),
    };
  }
  override retrieveSubscription(input: ProviderSubscriptionReference) {
    return this.call("subscription.retrieve", input, () => this.snapshot(input));
  }
  override setCancellation(
    input: ProviderSubscriptionReference &
      GatewayMutationContext & { readonly cancelAtPeriodEnd: boolean },
  ) {
    return this.call("subscription.cancellation.update", input, async () => {
      await this.snapshot(input);
      await this.settings().stripe.subscriptions.update(
        input.providerSubscriptionId,
        { cancel_at_period_end: input.cancelAtPeriodEnd },
        { idempotencyKey: input.idempotencyKey },
      );
      return this.snapshot(input);
    });
  }
  override verifyWebhook(input: {
    readonly rawBody: Uint8Array;
    readonly signature: string;
  }): VerifiedSubscriptionEvent {
    const { stripe, config } = this.settings();
    try {
      const event = stripe.webhooks.constructEvent(
        Buffer.from(input.rawBody),
        input.signature,
        config.STRIPE_WEBHOOK_SECRET,
      );
      if (event.livemode !== (config.NODE_ENV === "production")) throw new Error("Mode mismatch");
      if (
        typeof event.id !== "string" ||
        !event.id.startsWith("evt_") ||
        event.id.length > 255 ||
        typeof event.type !== "string" ||
        event.type.length > 100 ||
        !Number.isFinite(event.created)
      )
        throw new Error("Invalid event envelope");
      const object = event.data.object as unknown as Record<string, unknown>;
      const id = (value: unknown): string | null =>
        typeof value === "string"
          ? value
          : value !== null &&
              typeof value === "object" &&
              "id" in value &&
              typeof value.id === "string"
            ? value.id
            : null;
      const record = (value: unknown): Record<string, unknown> =>
        value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
      const details = record(record(object.parent).subscription_details);
      const metadata =
        object.object === "invoice" ? record(details.metadata) : record(object.metadata);
      return {
        accountIdHint: typeof metadata.ice24AccountId === "string" ? metadata.ice24AccountId : null,
        originCorrelationId:
          object.object === "checkout.session" && isCorrelationId(metadata.ice24CorrelationId)
            ? metadata.ice24CorrelationId
            : null,
        providerEventId: event.id,
        eventType: event.type,
        occurredAt: new Date(event.created * 1000).toISOString(),
        liveMode: event.livemode,
        providerCustomerId: id(object.customer),
        providerSubscriptionId:
          object.object === "subscription"
            ? id(object.id)
            : (id(object.subscription) ?? id(details.subscription)),
        payload: event,
      };
    } catch {
      throw new SubscriptionGatewayError("INVALID_WEBHOOK_SIGNATURE", false);
    }
  }
}
