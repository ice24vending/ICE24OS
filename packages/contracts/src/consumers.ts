import { z } from "zod";

/** Stable identity of a domain-event consumer; part of its idempotency key. */
export const consumerNameSchema = z.string().regex(/^[a-z][a-z0-9-]{2,79}$/u, "kebab-case, 3–80");

/** Failure codes are diagnostic identifiers only: never error messages or payload data. */
export const consumerFailureCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]{1,79}$/u);

export const domainEventBatchSummarySchema = z.object({
  received: z.number().int().nonnegative(),
  processed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  unhandled: z.number().int().nonnegative(),
  retried: z.number().int().nonnegative(),
  deadLettered: z.number().int().nonnegative(),
});

export type DomainEventBatchSummary = z.infer<typeof domainEventBatchSummarySchema>;
