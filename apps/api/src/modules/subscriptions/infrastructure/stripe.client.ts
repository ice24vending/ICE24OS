import { parseStripeConfig } from "@ice24/config";
import Stripe from "stripe";

export const STRIPE_API_VERSION = "2026-08-26.dahlia" as const;

/** Construction validates local settings only; credentials and Price require remote checks later. */
export function createStripeClient(environment: unknown): Stripe {
  const config = parseStripeConfig(environment);
  return new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
    timeout: 10_000,
    maxNetworkRetries: 2,
    telemetry: false,
  });
}
