/** Resolved by the authenticated application layer, never trusted from browser input. */
export interface GatewayContext {
  readonly accountId: string;
  readonly correlationId: string;
}

export interface GatewayMutationContext extends GatewayContext {
  /** Persisted per account, operation and request body before contacting the provider. */
  readonly idempotencyKey: string;
}

export interface CheckoutSessionInput extends GatewayMutationContext {
  readonly providerCustomerId: string | null;
  readonly providerPriceId: string;
  readonly expectedAmountMinor: number;
  readonly returnUrl: string;
  readonly cancelUrl: string;
}

export interface CheckoutSession {
  readonly providerCustomerId: string;
  readonly providerSessionId: string;
  readonly url: string;
  readonly expiresAt: string;
}

export interface PortalSessionInput extends GatewayMutationContext {
  readonly providerCustomerId: string;
  readonly returnUrl: string;
}

export interface PortalSession {
  readonly providerSessionId: string;
  readonly url: string;
  /** Null when the provider does not expose a precise expiration. Not an HTTP DTO. */
  readonly expiresAt: string | null;
}

export interface ProviderSubscriptionReference extends GatewayContext {
  readonly providerCustomerId: string;
  readonly providerSubscriptionId: string;
}

/** External observations, not commands to activate a local account. */
export interface ProviderSubscriptionSnapshot extends ProviderSubscriptionReference {
  readonly providerStatus: string;
  readonly providerPriceId: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly currentPeriodStart: string | null;
  readonly currentPeriodEnd: string | null;
  readonly cancelAtPeriodEnd: boolean;
  readonly latestInvoiceId: string | null;
  readonly paymentStatus: "paid" | "failed" | "pending" | "unknown";
  readonly observedAt: string;
}

export interface VerifiedSubscriptionEvent {
  /** Routing hint only; customer/subscription ownership must be checked against Stripe. */
  readonly accountIdHint: string | null;
  readonly providerEventId: string;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly liveMode: boolean;
  readonly providerCustomerId: string | null;
  readonly providerSubscriptionId: string | null;
  /** Verified original event; retain in protected storage, never ordinary logs. */
  readonly payload: unknown;
}

export type SubscriptionGatewayErrorCode =
  | "DEPENDENCY_UNAVAILABLE"
  | "INVALID_WEBHOOK_SIGNATURE"
  | "IDEMPOTENCY_CONFLICT"
  | "RESOURCE_NOT_FOUND"
  | "STATE_TRANSITION_INVALID";

export class SubscriptionGatewayError extends Error {
  constructor(
    readonly code: SubscriptionGatewayErrorCode,
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = "SubscriptionGatewayError";
  }
}

/** Provider port: no SDK, HTTP framework or database dependency. */
export abstract class SubscriptionGateway {
  abstract createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession>;
  abstract createPortalSession(input: PortalSessionInput): Promise<PortalSession>;
  abstract retrieveSubscription(
    input: ProviderSubscriptionReference,
  ): Promise<ProviderSubscriptionSnapshot>;
  abstract setCancellation(
    input: ProviderSubscriptionReference &
      GatewayMutationContext & {
        readonly cancelAtPeriodEnd: boolean;
      },
  ): Promise<ProviderSubscriptionSnapshot>;
  abstract verifyWebhook(input: {
    readonly rawBody: Uint8Array;
    readonly signature: string;
  }): VerifiedSubscriptionEvent;
}
