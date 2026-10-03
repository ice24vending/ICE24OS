import { z } from "zod";

const uuid = z.string().uuid();
const timestamp = z.iso.datetime({ offset: true });

// Domain events cross module boundaries with a small, explicitly classified payload.
// Unlike the v1 request envelope, system and Stripe actors have no user or account context.
export const outboxSensitivitySchema = z.enum(["public", "internal", "confidential", "sensitive"]);
export const outboxActorSchema = z
  .object({
    type: z.enum(["USER", "SYSTEM", "STRIPE"]),
    userId: uuid.nullable(),
  })
  .refine((actor) => (actor.type === "USER") === (actor.userId !== null), {
    message: "USER actors require userId; SYSTEM and STRIPE actors must not impersonate users",
  });

const eventTypeSchema = z
  .string()
  .max(120)
  .regex(/^[A-Z][A-Za-z0-9]+$/u, "Event types use PascalCase past tense");
const payloadSchema = z.record(z.string(), z.unknown());

export const outboxEventInputSchema = z
  .object({
    id: uuid.optional(),
    type: eventTypeSchema,
    eventVersion: z.number().int().positive().default(1),
    aggregateType: z.string().trim().min(1).max(80),
    aggregateId: uuid,
    aggregateVersion: z.number().int().nonnegative().default(0),
    accountId: uuid.nullable(),
    actor: outboxActorSchema,
    contextSessionId: uuid.nullable().default(null),
    payload: payloadSchema.default({}),
    sensitivity: outboxSensitivitySchema,
    causationId: uuid.nullable().default(null),
    correlationId: uuid,
    occurredAt: timestamp,
  })
  .strict()
  .refine((event) => event.actor.type === "USER" || event.contextSessionId === null, {
    message: "Non-human actors cannot carry a user context session",
    path: ["contextSessionId"],
  });

export const OUTBOX_MESSAGE_VERSION = 1 as const;
export const outboxMessageSchema = z
  .object({
    messageVersion: z.literal(OUTBOX_MESSAGE_VERSION),
    eventId: uuid,
    type: eventTypeSchema,
    eventVersion: z.number().int().positive(),
    aggregateType: z.string().min(1).max(80),
    aggregateId: uuid,
    aggregateVersion: z.number().int().nonnegative(),
    accountId: uuid.nullable(),
    actor: outboxActorSchema,
    contextSessionId: uuid.nullable(),
    correlationId: uuid,
    causationId: uuid.nullable(),
    occurredAt: timestamp,
    sensitivity: outboxSensitivitySchema,
    payload: payloadSchema,
  })
  .strict();

export const outboxPublishSummarySchema = z.object({
  published: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
});
export const outboxStatusSchema = z.object({
  pending: z.number().int().nonnegative(),
  failing: z.number().int().nonnegative(),
  maxAttempts: z.number().int().nonnegative().nullable(),
  oldestPendingSeconds: z.number().int().nonnegative().nullable(),
});

export type OutboxEventInput = z.input<typeof outboxEventInputSchema>;
export type OutboxEvent = z.output<typeof outboxEventInputSchema>;
export type OutboxMessage = z.infer<typeof outboxMessageSchema>;
export type OutboxPublishSummary = z.infer<typeof outboxPublishSummarySchema>;
export type OutboxStatus = z.infer<typeof outboxStatusSchema>;
