import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { StripeSubscriptionGateway } from "./stripe.gateway.js";

const environment = {
  NODE_ENV: "test",
  STRIPE_SECRET_KEY: "sk_test_fixture",
  STRIPE_WEBHOOK_SECRET: "whsec_fixture",
  STRIPE_PRICE_ID: "price_fixture",
  PRIVATE_WEB_URL: "http://localhost:3000",
};
const input = {
  accountId: "account",
  correlationId: "trace",
  idempotencyKey: "checkout:intent",
  providerCustomerId: null,
  providerPriceId: "price_fixture",
  expectedAmountMinor: 39900,
  returnUrl: "http://localhost:3000/subscription",
  cancelUrl: "http://localhost:3000/subscription",
};
describe("Stripe subscription adapter", () => {
  let client: Stripe, gateway: StripeSubscriptionGateway;
  beforeEach(() => {
    client = new Stripe("sk_test_fixture");
    gateway = new StripeSubscriptionGateway(environment, client);
  });
  it("uses recurring Checkout, account metadata and stable provider idempotency", async () => {
    const price = vi.spyOn(client.prices, "retrieve").mockResolvedValue({
      active: true,
      currency: "mxn",
      unit_amount: 39900,
      livemode: false,
      recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
    } as never);
    const customer = vi
      .spyOn(client.customers, "create")
      .mockResolvedValue({ id: "cus_fixture" } as never);
    vi.spyOn(client.subscriptions, "list").mockResolvedValue({
      has_more: false,
      data: [],
    } as never);
    const checkout = vi.spyOn(client.checkout.sessions, "create").mockResolvedValue({
      id: "cs_fixture",
      url: "https://checkout.stripe.com/fixture",
      expires_at: 2000000000,
    } as never);
    const result = await gateway.createCheckoutSession(input);
    expect(price).toHaveBeenCalledWith("price_fixture");
    expect(customer).toHaveBeenCalledWith(
      { metadata: { ice24AccountId: "account" } },
      { idempotencyKey: "customer:account" },
    );
    expect(checkout).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_fixture",
        client_reference_id: "account",
        line_items: [{ price: "price_fixture", quantity: 1 }],
      }),
      { idempotencyKey: "checkout:intent" },
    );
    expect(result.providerCustomerId).toBe("cus_fixture");
  });
  it("rejects incorrect prices before creating a customer", async () => {
    vi.spyOn(client.prices, "retrieve").mockResolvedValue({
      active: true,
      currency: "usd",
      unit_amount: 39900,
    } as never);
    const create = vi.spyOn(client.customers, "create");
    await expect(gateway.createCheckoutSession(input)).rejects.toMatchObject({
      code: "STATE_TRANSITION_INVALID",
    });
    expect(create).not.toHaveBeenCalled();
  });
  it("refuses an existing active subscription", async () => {
    vi.spyOn(client.prices, "retrieve").mockResolvedValue({
      active: true,
      currency: "mxn",
      unit_amount: 39900,
      livemode: false,
      recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
    } as never);
    vi.spyOn(client.customers, "retrieve").mockResolvedValue({
      id: "cus_fixture",
      metadata: { ice24AccountId: "account" },
    } as never);
    vi.spyOn(client.subscriptions, "list").mockResolvedValue({
      has_more: false,
      data: [{ status: "active" }],
    } as never);
    await expect(
      gateway.createCheckoutSession({ ...input, providerCustomerId: "cus_fixture" }),
    ).rejects.toMatchObject({ code: "STATE_TRANSITION_INVALID" });
  });
  it("prevents customer cross-account access to the portal", async () => {
    vi.spyOn(client.customers, "retrieve").mockResolvedValue({
      id: "cus_fixture",
      metadata: { ice24AccountId: "other" },
    } as never);
    const portal = vi.spyOn(client.billingPortal.sessions, "create");
    await expect(
      gateway.createPortalSession({ ...input, providerCustomerId: "cus_fixture" }),
    ).rejects.toMatchObject({ code: "STATE_TRANSITION_INVALID" });
    expect(portal).not.toHaveBeenCalled();
  });
  it("creates a portal with an honest unknown expiration", async () => {
    vi.spyOn(client.customers, "retrieve").mockResolvedValue({
      id: "cus_fixture",
      metadata: { ice24AccountId: "account" },
    } as never);
    vi.spyOn(client.billingPortal.sessions, "create").mockResolvedValue({
      id: "bps_fixture",
      url: "https://billing.stripe.com/fixture",
    } as never);
    expect(
      await gateway.createPortalSession({ ...input, providerCustomerId: "cus_fixture" }),
    ).toEqual({
      providerSessionId: "bps_fixture",
      url: "https://billing.stripe.com/fixture",
      expiresAt: null,
    });
  });
  it("normalizes provider failures without exposing their messages", async () => {
    vi.spyOn(client.customers, "retrieve").mockRejectedValue(new Error("secret upstream details"));
    await expect(
      gateway.createPortalSession({ ...input, providerCustomerId: "cus_fixture" }),
    ).rejects.toMatchObject({ message: "DEPENDENCY_UNAVAILABLE", retryable: true });
  });
  it.each([
    ["paid", 0, 2000000000, "paid"],
    ["paid", 0, 1800000000, "unknown"],
    ["open", 1, 2000000000, "failed"],
    ["open", 0, 2000000000, "pending"],
  ])(
    "reconciles invoice %s with %s attempts and coverage ending %s as %s",
    async (status, attempts, end, expected) => {
      vi.spyOn(client.customers, "retrieve").mockResolvedValue({
        id: "cus_fixture",
        metadata: { ice24AccountId: "account" },
      } as never);
      vi.spyOn(client.subscriptions, "retrieve").mockResolvedValue({
        id: "sub_fixture",
        customer: "cus_fixture",
        metadata: { ice24AccountId: "account" },
        status: "active",
        livemode: false,
        cancel_at_period_end: false,
        items: {
          has_more: false,
          data: [
            {
              id: "si_fixture",
              quantity: 1,
              current_period_start: 1900000000,
              current_period_end: 2000000000,
              price: {
                id: "price_fixture",
                unit_amount: 39900,
                currency: "mxn",
                recurring: { interval: "month", interval_count: 1 },
              },
            },
          ],
        },
        latest_invoice: {
          id: "in_fixture",
          status,
          attempt_count: attempts,
          lines: {
            data: [
              {
                parent: { subscription_item_details: { subscription_item: "si_fixture" } },
                period: { start: 1900000000, end },
              },
            ],
          },
        },
      } as never);
      const result = await gateway.retrieveSubscription({
        accountId: "account",
        providerCustomerId: "cus_fixture",
        providerSubscriptionId: "sub_fixture",
        correlationId: "trace",
      });
      expect(result.paymentStatus).toBe(expected);
      expect(result.amountMinor).toBe(39900);
    },
  );

  it("extracts current invoice subscription metadata from signed parent details", () => {
    const payload = JSON.stringify({
      id: "evt_invoice",
      type: "invoice.paid",
      created: 1700000000,
      livemode: false,
      data: {
        object: {
          object: "invoice",
          id: "in_fixture",
          customer: "cus_fixture",
          parent: {
            subscription_details: {
              subscription: "sub_fixture",
              metadata: { ice24AccountId: "account" },
            },
          },
        },
      },
    });
    const signature = client.webhooks.generateTestHeaderString({
      payload,
      secret: environment.STRIPE_WEBHOOK_SECRET,
    });
    expect(gateway.verifyWebhook({ rawBody: Buffer.from(payload), signature })).toMatchObject({
      accountIdHint: "account",
      providerCustomerId: "cus_fixture",
      providerSubscriptionId: "sub_fixture",
    });
  });

  it("verifies signed bytes and rejects tampering and wrong environment", () => {
    const payload = JSON.stringify({
      id: "evt_fixture",
      type: "customer.subscription.updated",
      created: 1700000000,
      livemode: false,
      data: { object: { object: "subscription", id: "sub_fixture", customer: "cus_fixture" } },
    });
    const signature = client.webhooks.generateTestHeaderString({
      payload,
      secret: environment.STRIPE_WEBHOOK_SECRET,
    });
    expect(
      gateway.verifyWebhook({ rawBody: Buffer.from(payload), signature }).providerSubscriptionId,
    ).toBe("sub_fixture");
    expect(() => gateway.verifyWebhook({ rawBody: Buffer.from(payload + " "), signature })).toThrow(
      "INVALID_WEBHOOK_SIGNATURE",
    );
    const live = payload.replace('"livemode":false', '"livemode":true');
    const liveSignature = client.webhooks.generateTestHeaderString({
      payload: live,
      secret: environment.STRIPE_WEBHOOK_SECRET,
    });
    expect(() =>
      gateway.verifyWebhook({ rawBody: Buffer.from(live), signature: liveSignature }),
    ).toThrow("INVALID_WEBHOOK_SIGNATURE");
  });
});
