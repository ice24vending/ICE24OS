import { z } from "zod";
import { createCursorPageSchema, cursorPageRequestSchema } from "./pagination.js";

const uuid = z.string().uuid();
const timestamp = z.iso.datetime({ offset: true });
export const auditCursorSchema = z.tuple([z.iso.datetime({ precision: 6 }), uuid]);
const summary = z.record(
  z.string(),
  z.union([
    z.string().max(1000),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(z.string().max(200)).max(1000),
  ]),
);

// Producers supply explicitly selected summaries, never raw requests or credentials.
export const auditEventInputSchema = z
  .object({
    eventVersion: z.literal(1),
    occurredAt: timestamp,
    timeZone: z
      .string()
      .min(1)
      .max(64)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Invalid time zone"),
    actorUserId: uuid.nullable(),
    actorType: z.enum(["USER", "SYSTEM", "STRIPE"]),
    contextSessionId: uuid.nullable(),
    accountId: uuid.nullable(),
    branchId: uuid.nullable(),
    machineId: uuid.nullable(),
    entityType: z.string().min(1).max(80),
    entityId: uuid,
    operation: z.string().min(1).max(80),
    previousValues: summary.nullable(),
    newValues: summary.nullable(),
    reason: z.string().max(2000).nullable(),
    origin: z.enum(["WEB", "API", "WORKER", "OFFLINE_SYNC", "WEBHOOK", "ADMIN"]),
    ipAddress: z.union([z.ipv4(), z.ipv6()]).nullable(),
    deviceSummary: summary.nullable(),
    result: z.enum(["SUCCESS", "DENIED", "FAILED"]),
    correlationId: uuid,
  })
  .strict()
  .refine(
    (value) =>
      value.actorType === "USER"
        ? value.actorUserId !== null
        : value.actorUserId === null && value.contextSessionId === null,
    "Invalid actor",
  );

export const auditEventSchema = auditEventInputSchema.safeExtend({
  id: uuid,
  occurredAtLocal: z.string(),
  createdAt: timestamp,
});
export const auditQuerySchema = cursorPageRequestSchema
  .extend({
    accountId: uuid.optional(),
    branchId: uuid.optional(),
    machineId: uuid.optional(),
    actorUserId: uuid.optional(),
    entityId: uuid.optional(),
    entityType: z.string().min(1).max(80).optional(),
    operation: z.string().min(1).max(80).optional(),
    result: z.enum(["SUCCESS", "DENIED", "FAILED"]).optional(),
    correlationId: uuid.optional(),
    from: timestamp.optional(),
    to: timestamp.optional(),
  })
  .strict()
  .refine(
    (value) => !value.from || !value.to || Date.parse(value.from) <= Date.parse(value.to),
    "Invalid date range",
  );
export const auditPageSchema = createCursorPageSchema(auditEventSchema);
export const auditOpenApi = {
  event: z.toJSONSchema(auditEventSchema),
  page: z.toJSONSchema(auditPageSchema),
  query: z.toJSONSchema(auditQuerySchema),
};
export type AuditEventInput = z.infer<typeof auditEventInputSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type AuditPage = z.infer<typeof auditPageSchema>;
