import { z } from "zod";

export const subscriptionStatusSchema = z.enum([
  "demo",
  "pending_activation",
  "active",
  "payment_failed",
  "read_only",
  "cancellation_scheduled",
  "cancelled",
  "reactivated",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
const timestamp = z.iso.datetime({ offset: true });
export const subscriptionSchema = z
  .object({
    id: z.string().uuid(),
    accountId: z.string().uuid(),
    provider: z.literal("stripe"),
    providerCustomerId: z.string().min(1).max(255).nullable(),
    providerSubscriptionId: z.string().min(1).max(255).nullable(),
    planCode: z.string().min(1).max(80),
    price: z
      .object({
        amountMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
        currency: z.literal("MXN"),
      })
      .strict(),
    status: subscriptionStatusSchema,
    currentPeriodStart: timestamp.nullable(),
    currentPeriodEnd: timestamp.nullable(),
    cancelAtPeriodEnd: z.boolean(),
    isDemo: z.boolean(),
    demoExpiresAt: timestamp.nullable(),
    version: z.number().int().positive(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict()
  .superRefine((value, ctx) => {
    const invalid = (message: string) => ctx.addIssue({ code: "custom", message });
    if (value.isDemo !== (value.demoExpiresAt !== null))
      invalid("Demo expiration is required only for demos");
    if (value.isDemo && !["demo", "read_only"].includes(value.status))
      invalid("A demo cannot become a paid account");
    if (!value.isDemo && value.status === "demo") invalid("Demo state requires a demo account");
    if (
      ["active", "reactivated", "cancellation_scheduled", "payment_failed", "cancelled"].includes(
        value.status,
      ) &&
      (!value.providerCustomerId ||
        !value.providerSubscriptionId ||
        !value.currentPeriodStart ||
        !value.currentPeriodEnd)
    )
      invalid("Paid subscriptions require provider identifiers and a period");
    if ((value.currentPeriodStart === null) !== (value.currentPeriodEnd === null))
      invalid("Both period boundaries are required");
    if (
      value.currentPeriodStart &&
      value.currentPeriodEnd &&
      Date.parse(value.currentPeriodEnd) <= Date.parse(value.currentPeriodStart)
    )
      invalid("Invalid billing period");
    if (value.cancelAtPeriodEnd !== (value.status === "cancellation_scheduled"))
      invalid("Cancellation flag and status must agree");
  });
export type Subscription = z.infer<typeof subscriptionSchema>;
export const subscriptionViewSchema = subscriptionSchema.safeExtend({
  audit: z
    .object({
      createdAt: timestamp,
      createdBy: z.string().uuid(),
      updatedAt: timestamp,
      updatedBy: z.string().uuid(),
      version: z.number().int().positive(),
    })
    .strict(),
  accessMode: z.enum(["ACTIVE", "READ_ONLY", "SUSPENDED"]),
});
export type SubscriptionView = z.infer<typeof subscriptionViewSchema>;
export const extendDemoSchema = z
  .object({
    newExpiresAt: timestamp,
    reason: z.string().trim().min(10).max(1000),
  })
  .strict();
export const provisionSubscriptionSchema = z
  .object({
    accountName: z.string().trim().min(1).max(200),
    accountType: z.enum(["INDIVIDUAL", "COMPANY"]),
    ownerUserId: z.string().uuid(),
  })
  .strict();
