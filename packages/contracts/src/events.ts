import { z } from "zod";

import { actorSchema, requestContextSchema } from "./identity.js";
import { EVENT_ENVELOPE_VERSION } from "./versioning.js";

export const createEventEnvelopeSchema = <Payload extends z.ZodType>(payloadSchema: Payload) =>
  z.object({
    eventId: z.string().uuid(),
    type: z.string().regex(/^[A-Z][A-Za-z0-9]+$/u),
    envelopeVersion: z.literal(EVENT_ENVELOPE_VERSION),
    eventVersion: z.number().int().positive(),
    aggregateId: z.string().uuid(),
    aggregateVersion: z.number().int().nonnegative(),
    occurredAt: z.iso.datetime({ offset: true }),
    actor: actorSchema,
    context: requestContextSchema,
    causationId: z.string().uuid().optional(),
    sensitivity: z.enum(["public", "internal", "confidential", "sensitive"]),
    payload: payloadSchema,
  });
