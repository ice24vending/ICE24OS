import { z } from "zod";
export const ticketIdSchema = z.uuid();

export const ticketPrioritySchema = z.enum(["low", "normal", "high", "critical"]);
export const ticketInputSchema = z.strictObject({
  machineId: z.uuid(),
  systemId: z.uuid(),
  componentId: z.uuid().nullable().default(null),
  priority: ticketPrioritySchema,
  description: z.string().trim().min(10, "Describe la falla con al menos 10 caracteres.").max(4000),
  evidenceIds: z
    .array(z.uuid())
    .max(10)
    .default([])
    .refine((v) => new Set(v).size === v.length),
  activityId: z.uuid().nullable().default(null),
});
export const ticketDiagnosisSchema = z.strictObject({
  diagnosis: z.string().trim().min(10).max(4000),
  reason: z.string().trim().min(5).max(1000),
});
export const ticketSchema = ticketInputSchema.extend({
  id: z.uuid(),
  folio: z.string(),
  machineCode: z.string(),
  systemName: z.string(),
  componentName: z.string().nullable(),
  state: z.enum(["pending_assignment", "in_progress", "completed", "cancelled"]),
  diagnosis: z.string().nullable(),
  workOrderId: z.uuid().nullable(),
  rowVersion: z.number().int().positive(),
  createdAt: z.iso.datetime(),
});
export const ticketEventSchema = z.object({
  id: z.uuid(),
  operation: z.string(),
  occurredAt: z.iso.datetime(),
  reason: z.string().nullable(),
  diagnosis: z.string().nullable(),
});
export const ticketDetailSchema = z.object({
  ticket: ticketSchema,
  events: z.array(ticketEventSchema),
});
export const ticketQuerySchema = z.object({
  machineId: z.uuid().optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const ticketPageSchema = z.object({
  items: z.array(ticketSchema),
  nextCursor: z.uuid().nullable(),
});
export const ticketOptionsSchema = z.object({
  systems: z.array(z.object({ id: z.uuid(), name: z.string() })),
  components: z.array(z.object({ id: z.uuid(), name: z.string() })),
});
export type Ticket = z.infer<typeof ticketSchema>;
export type TicketInput = z.infer<typeof ticketInputSchema>;
export type TicketDetail = z.infer<typeof ticketDetailSchema>;
export const ticketsOpenApi = Object.fromEntries(
  Object.entries({
    create: ticketInputSchema,
    ticket: ticketSchema,
    diagnosis: ticketDiagnosisSchema,
    detail: ticketDetailSchema,
    page: ticketPageSchema,
    options: ticketOptionsSchema,
  }).map(([key, schema]) => [key, z.toJSONSchema(schema, { target: "openapi-3.0" })]),
);
