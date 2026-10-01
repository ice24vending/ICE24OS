import { afterEach, expect, it, vi } from "vitest";
import { createStripeClient, STRIPE_API_VERSION } from "./stripe.client.js";

afterEach(() => vi.unstubAllGlobals());

it("constructs the pinned SDK locally without fetching or accepting incomplete settings", () => {
  const fetch = vi.fn(() => {
    throw new Error("Unexpected network request");
  });
  vi.stubGlobal("fetch", fetch);
  const client = createStripeClient({
    NODE_ENV: "test",
    STRIPE_SECRET_KEY: "sk_test_fixture",
    STRIPE_WEBHOOK_SECRET: "whsec_fixture",
    STRIPE_PRICE_ID: "price_fixture",
    PRIVATE_WEB_URL: "http://localhost:3000",
  });
  expect(client.getApiField("version")).toBe(STRIPE_API_VERSION);
  expect(client.getApiField("timeout")).toBe(10_000);
  expect(client.getMaxNetworkRetries()).toBe(2);
  expect(() => createStripeClient({})).toThrow("Invalid Stripe configuration");
  expect(fetch).not.toHaveBeenCalled();
});
