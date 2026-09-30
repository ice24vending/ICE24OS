import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { parseStripeConfig } from "@ice24/config";
import {
  billingSessionResponseSchema,
  checkoutSessionRequestSchema,
  portalSessionRequestSchema,
} from "@ice24/contracts";
import { getHeader, type SecurityRequest } from "../../../common/security/security-request.js";
import { SubscriptionPort } from "./subscription.port.js";
import { SubscriptionGateway } from "./subscription.gateway.js";

@Injectable()
export class BillingService {
  constructor(
    @Inject(SubscriptionPort) private readonly db: SubscriptionPort,
    @Inject(SubscriptionGateway) private readonly gateway: SubscriptionGateway,
  ) {}
  private config() {
    try {
      return parseStripeConfig(process.env);
    } catch {
      throw new ServiceUnavailableException();
    }
  }
  private url(value: string, origin: string) {
    const url = new URL(value);
    if (url.origin !== new URL(origin).origin || url.username || url.password)
      throw new BadRequestException("Return URL is not permitted");
  }
  async checkout(request: SecurityRequest, body: unknown) {
    const input = checkoutSessionRequestSchema.parse(body);
    const config = this.config();
    this.url(input.returnUrl, config.PRIVATE_WEB_URL);
    this.url(input.cancelUrl, config.PRIVATE_WEB_URL);
    const payload = { ...input, price: config.STRIPE_PRICE_ID };
    // Commit conversion and stable provider key before any network I/O.
    const prepared = await this.db.run(
      request,
      "billing:checkout:prepare",
      payload,
      false,
      true,
      async (tx) => {
        const target = await tx.billingTarget();
        if (!["pending_activation", "cancelled"].includes(target.status))
          throw new ConflictException("Use the billing portal for an existing subscription");
        const intent = await tx.billingIntent(target.accountId, {
          ...payload,
          amount: target.price.amountMinor,
        });
        return { accountId: target.accountId, intentId: intent.id };
      },
      true,
    );
    const response = await this.db.run(
      request,
      "billing:checkout",
      payload,
      false,
      true,
      async (tx) => {
        const target = await tx.billingTarget();
        if (
          target.accountId !== prepared.accountId ||
          !["pending_activation", "cancelled"].includes(target.status)
        )
          throw new ConflictException("Subscription state changed");
        const intent = await tx.billingIntent(target.accountId, {
          ...payload,
          amount: target.price.amountMinor,
        });
        if (intent.id !== prepared.intentId)
          throw new ConflictException("Checkout expired; use a new idempotency key");
        if (intent.response) return billingSessionResponseSchema.parse(intent.response);
        const session = await this.gateway.createCheckoutSession({
          accountId: target.accountId,
          correlationId: request.correlationId ?? intent.id,
          idempotencyKey: `checkout:${intent.id}`,
          providerCustomerId: target.providerCustomerId,
          providerPriceId: config.STRIPE_PRICE_ID,
          expectedAmountMinor: target.price.amountMinor,
          ...input,
        });
        await tx.save(
          {
            ...target,
            providerCustomerId: session.providerCustomerId,
            version: target.version + 1,
            updatedAt: tx.now,
          },
          target,
          "CheckoutSessionCreated",
          "Hosted checkout created; payment confirmation still required",
        );
        const result = {
          url: session.url,
          expiresAt: session.expiresAt,
          accountId: target.accountId,
        };
        await tx.finishBillingIntent(target.accountId, intent.id, result, session.expiresAt);
        return result;
      },
      true,
    );
    if (response.expiresAt && Date.parse(response.expiresAt) <= Date.now())
      throw new ConflictException("Checkout expired; use a new idempotency key");
    return response;
  }
  async portal(request: SecurityRequest, body: unknown) {
    const input = portalSessionRequestSchema.parse(body);
    this.url(input.returnUrl, this.config().PRIVATE_WEB_URL);
    return this.db.run(
      request,
      "billing:portal",
      input,
      false,
      true,
      async (tx) => {
        const current = await tx.read(tx.accountId);
        if (current.isDemo && !(await tx.conversion(current.accountId)))
          throw new ConflictException("Checkout is required first");
        const target = await tx.billingTarget();
        if (!target.providerCustomerId)
          throw new ConflictException("Stripe customer not available");
        const key = createHash("sha256")
          .update(
            JSON.stringify([
              target.accountId,
              request.localUser?.id,
              getHeader(request, "idempotency-key"),
              input,
            ]),
          )
          .digest("hex");
        const session = await this.gateway.createPortalSession({
          accountId: target.accountId,
          correlationId: request.correlationId ?? key,
          idempotencyKey: `portal:${key}`,
          providerCustomerId: target.providerCustomerId,
          ...input,
        });
        return { url: session.url, expiresAt: session.expiresAt, accountId: target.accountId };
      },
      true,
    );
  }
}
