import { z } from "zod";
export const ticketIdSchema = z.uuid();

export const ticketPrioritySchema = z.enum(["low", "normal", "high", "critical"]);
export const ticketStateSchema = z.enum([
  "pending_assignment",
  "in_progress",
  "completed",
  "cancelled",
]);
const ticketPersonSchema = z.object({ id: z.uuid(), name: z.string() });
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
  state: ticketStateSchema,
  diagnosis: z.string().nullable(),
  workOrderId: z.uuid().nullable(),
  rowVersion: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  // Optional additions: persisted field-app packages and older responses remain valid.
  branchId: z.uuid().optional(),
  branchName: z.string().optional(),
  reportedBy: ticketPersonSchema.nullable().optional(),
  assignedTo: ticketPersonSchema.nullable().optional(),
  resolvedAt: z.iso.datetime().nullable().optional(),
  workOrderFolio: z.string().nullable().optional(),
  displayState: ticketStateSchema.optional(),
});
export const ticketEventSchema = z.object({
  id: z.uuid(),
  operation: z.string(),
  occurredAt: z.iso.datetime(),
  reason: z.string().nullable(),
  diagnosis: z.string().nullable(),
  actorName: z.string().nullable().optional(),
});
export const ticketDetailSchema = z.object({
  ticket: ticketSchema,
  events: z.array(ticketEventSchema),
  timeZone: z.string().optional(),
});
export const ticketQuerySchema = z
  .object({
    machineId: z.uuid().optional(),
    branchId: z.uuid().optional(),
    state: ticketStateSchema.optional(),
    priority: ticketPrioritySchema.optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    metric: z.enum(["open", "unassigned", "highPriority", "resolvedToday"]).optional(),
    cursor: z.uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "La fecha inicial debe ser anterior o igual a la final.",
    path: ["to"],
  });
export const ticketSummarySchema = z.object({
  open: z.number().int().nonnegative(),
  unassigned: z.number().int().nonnegative(),
  highPriority: z.number().int().nonnegative(),
  resolvedToday: z.number().int().nonnegative(),
  timeZone: z.string(),
  asOf: z.iso.datetime(),
});
export const ticketPageSchema = z.object({
  items: z.array(ticketSchema),
  nextCursor: z.uuid().nullable(),
  total: z.number().int().nonnegative().optional(),
  summary: ticketSummarySchema.optional(),
  filters: z
    .object({
      branches: z.array(z.object({ id: z.uuid(), name: z.string() })),
      machines: z.array(z.object({ id: z.uuid(), name: z.string(), branchId: z.uuid() })),
    })
    .optional(),
});
export const ticketOptionsSchema = z.object({
  systems: z.array(z.object({ id: z.uuid(), name: z.string() })),
  components: z.array(z.object({ id: z.uuid(), name: z.string() })),
});
export type Ticket = z.infer<typeof ticketSchema>;
export type TicketInput = z.infer<typeof ticketInputSchema>;
export type TicketDetail = z.infer<typeof ticketDetailSchema>;
export type TicketPage = z.infer<typeof ticketPageSchema>;
export type TicketQuery = z.infer<typeof ticketQuerySchema>;
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
