import { z } from "zod";
import { createCursorPageSchema, cursorPageRequestSchema } from "./pagination.js";

const uuid = z.string().uuid();
const timestamp = z.iso.datetime({ offset: true });

/**
 * F5-14 integration logs (PRD RF-ADM-009, RF-AUD-004, RNF-OBS-002/003): technical diagnosis of
 * the calls ICE24 OS makes to, and receives from, external systems. `pdf` has no adapter yet;
 * the PDF worker (TASK-F10-08) records through the same wrapper.
 */
export const integrationNameSchema = z.enum([
  "stripe",
  "email",
  "object_storage",
  "queue",
  "antimalware",
  "pdf",
]);
export const integrationDirectionSchema = z.enum(["OUTBOUND", "INBOUND"]);
export const integrationStatusSchema = z.enum(["SUCCEEDED", "FAILED"]);

/** Dotted lowercase operation, e.g. `checkout.session.create` or `webhook.receive`. */
export const integrationOperationSchema = z.string().regex(/^[a-z][a-z0-9_.:-]{1,79}$/u);
/** Provider status or normalized code (`200`, `404`, `card_declined`), never a message. */
export const integrationResponseCodeSchema = z.string().regex(/^[A-Za-z0-9_.:-]{1,40}$/u);
const errorCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]{1,79}$/u);

/** Redacted details: flat scalars only (see `redactIntegrationDetails`). */
export const integrationDetailsSchema = z.record(
  z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/u),
  z.union([z.string().max(200), z.number(), z.boolean(), z.null()]),
);

export const integrationLogSchema = z.object({
  id: uuid,
  integration: integrationNameSchema,
  operation: integrationOperationSchema,
  direction: integrationDirectionSchema,
  provider: z.string().min(2).max(40),
  status: integrationStatusSchema,
  latencyMs: z.number().int().nonnegative(),
  responseCode: integrationResponseCodeSchema.nullable(),
  errorCode: errorCodeSchema.nullable(),
  retryable: z.boolean().nullable(),
  attempt: z.number().int().positive(),
  effectKey: z.string().max(200).nullable(),
  correlationId: uuid,
  requestCorrelationId: uuid.nullable(),
  accountId: uuid.nullable(),
  jobId: uuid.nullable(),
  details: integrationDetailsSchema,
  occurredAt: timestamp,
});

export const integrationLogQuerySchema = cursorPageRequestSchema
  .extend({
    correlationId: uuid.optional(),
    integration: integrationNameSchema.optional(),
    status: integrationStatusSchema.optional(),
    direction: integrationDirectionSchema.optional(),
    accountId: uuid.optional(),
    from: timestamp.optional(),
    to: timestamp.optional(),
  })
  .strict()
  .refine(
    (value) => !value.from || !value.to || Date.parse(value.from) <= Date.parse(value.to),
    "Invalid date range",
  );
/** Opaque page cursor: (occurredAt, id) of the last row, base64url JSON. */
export const integrationLogCursorSchema = z.tuple([z.iso.datetime({ precision: 6 }), uuid]);
export const integrationLogPageSchema = createCursorPageSchema(integrationLogSchema);

export const integrationLogsOpenApi = {
  log: z.toJSONSchema(integrationLogSchema),
  page: z.toJSONSchema(integrationLogPageSchema),
  query: z.toJSONSchema(integrationLogQuerySchema),
};

export type IntegrationName = z.infer<typeof integrationNameSchema>;
export type IntegrationDirection = z.infer<typeof integrationDirectionSchema>;
export type IntegrationStatus = z.infer<typeof integrationStatusSchema>;
export type IntegrationDetails = z.infer<typeof integrationDetailsSchema>;
export type IntegrationLog = z.infer<typeof integrationLogSchema>;
export type IntegrationLogQuery = z.infer<typeof integrationLogQuerySchema>;
export type IntegrationLogPage = z.infer<typeof integrationLogPageSchema>;
