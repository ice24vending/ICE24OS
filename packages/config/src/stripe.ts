import { z } from "zod";

export const stripeConfigSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    STRIPE_SECRET_KEY: z.string().regex(/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/),
    STRIPE_WEBHOOK_SECRET: z.string().regex(/^whsec_[A-Za-z0-9]+$/),
    STRIPE_PRICE_ID: z.string().regex(/^price_[A-Za-z0-9]+$/),
    STRIPE_PORTAL_CONFIGURATION_ID: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z
        .string()
        .regex(/^bpc_[A-Za-z0-9]+$/)
        .optional(),
    ),
    PRIVATE_WEB_URL: z.url(),
  })
  .superRefine((config, context) => {
    const mode = config.NODE_ENV === "production" ? "live" : "test";
    if (
      !config.STRIPE_SECRET_KEY.startsWith(`sk_${mode}_`) &&
      !config.STRIPE_SECRET_KEY.startsWith(`rk_${mode}_`)
    ) {
      context.addIssue({
        code: "custom",
        path: ["STRIPE_SECRET_KEY"],
        message: "Stripe key mode does not match deployment environment",
      });
    }
    if (!URL.canParse(config.PRIVATE_WEB_URL)) return;
    const url = new URL(config.PRIVATE_WEB_URL);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    const allowHttp = ["development", "test"].includes(config.NODE_ENV) && local;
    if (
      (url.protocol !== "https:" && !(url.protocol === "http:" && allowHttp)) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    ) {
      context.addIssue({
        code: "custom",
        path: ["PRIVATE_WEB_URL"],
        message: "Expected an HTTPS origin; local HTTP is allowed only in development and test",
      });
    }
  });

export type StripeConfig = z.infer<typeof stripeConfigSchema>;

// Do not propagate input values or provider credentials through validation errors.
export function parseStripeConfig(input: unknown): StripeConfig {
  const result = stripeConfigSchema.safeParse(input);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Invalid Stripe configuration: ${fields.join(", ")}`);
  }
  return result.data;
}
