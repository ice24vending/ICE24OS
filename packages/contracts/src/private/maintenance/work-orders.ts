import { z } from "zod";
import { activityInputSchema, accountMaintenanceActivitySchema } from "../../equipment.js";
/** Preserves the worker's scheduling metadata and account-component definitions verbatim. */
export const workOrderDefinitionSchema = z.union([
  activityInputSchema.safeExtend({
    schedule: z.record(z.string(), z.unknown()).nullable().optional(),
  }),
  accountMaintenanceActivitySchema.safeExtend({
    componentCatalogId: z.uuid(),
    schedule: z.record(z.string(), z.unknown()).nullable().optional(),
    procedure: activityInputSchema.shape.procedure,
    plannedParts: activityInputSchema.shape.plannedParts,
  }),
]);
export const workOrderStateSchema = z.enum([
  "scheduled",
  "upcoming",
  "overdue",
  "in_progress",
  "completed",
  "with_observations",
  "nonconforming",
  "corrected",
  "cancelled",
]);
export const workOrderActionSchema = z.enum([
  "notify",
  "expire",
  "start",
  "complete",
  "observe",
  "reject",
  "correct",
  "cancel",
  "reopen",
]);
export const workOrderSourceSchema = z.enum(["ticket", "activity"]);
export const workOrderCreateSchema = z.strictObject({
  sourceType: workOrderSourceSchema,
  sourceId: z.uuid(),
  assigneeId: z.uuid(),
  activityCode: z.string().regex(/^[A-Z0-9_-]{2,40}$/),
  reason: z.string().trim().min(5).max(1000),
});
export const workOrderAssignmentSchema = z.strictObject({
  assigneeId: z.uuid(),
  reason: z.string().trim().min(5).max(1000),
});
export const workOrderTransitionSchema = z.strictObject({
  action: workOrderActionSchema,
  reason: z.string().trim().max(1000).default(""),
});
export const workOrderSchema = z.object({
  id: z.uuid(),
  folio: z.string(),
  machineId: z.uuid(),
  machineCode: z.string(),
  branchId: z.uuid(),
  sourceType: workOrderSourceSchema,
  sourceId: z.uuid(),
  ticketId: z.uuid().nullable(),
  activityId: z.uuid().nullable(),
  assigneeId: z.uuid(),
  assigneeName: z.string(),
  templateId: z.uuid(),
  templateVersion: z.number().int().positive(),
  definition: workOrderDefinitionSchema,
  state: workOrderStateSchema,
  dueAt: z.iso.datetime().nullable(),
  alertAt: z.iso.datetime().nullable(),
  rowVersion: z.number().int().positive(),
  createdAt: z.iso.datetime(),
});
export const workOrderQuerySchema = z.object({
  state: workOrderStateSchema.optional(),
  machineId: z.uuid().optional(),
  assigneeId: z.uuid().optional(),
  view: z.enum(["assigned", "downloaded", "pending"]).default("assigned"),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const workOrderPageSchema = z.object({
  items: z.array(workOrderSchema),
  nextCursor: z.uuid().nullable(),
});
export const workOrderOptionsSchema = z.object({
  sourceType: workOrderSourceSchema,
  sourceId: z.uuid(),
  rowVersion: z.number().int().positive(),
  machineId: z.uuid(),
  machineCode: z.string(),
  existingOrderId: z.uuid().nullable(),
  technicians: z.array(z.object({ id: z.uuid(), name: z.string() })),
  activities: z.array(workOrderDefinitionSchema),
});
export const workOrderDetailSchema = z.object({
  order: workOrderSchema,
  actions: z.array(
    z.object({ action: workOrderActionSchema, allowed: z.boolean(), message: z.string() }),
  ),
  canReassign: z.boolean(),
  canReleaseOffline: z.boolean().optional(),
  offlineLease: z
    .object({
      userId: z.uuid(),
      deviceId: z.uuid(),
      downloadedAt: z.iso.datetime(),
      expiresAt: z.iso.datetime(),
    })
    .nullable()
    .optional(),
  events: z.array(
    z.object({
      id: z.uuid(),
      operation: z.string(),
      reason: z.string().nullable(),
      occurredAt: z.iso.datetime(),
      state: workOrderStateSchema.nullable(),
    }),
  ),
});
export type WorkOrder = z.infer<typeof workOrderSchema>;
export type WorkOrderDetail = z.infer<typeof workOrderDetailSchema>;
export type WorkOrderOptions = z.infer<typeof workOrderOptionsSchema>;
export const workOrdersOpenApi = Object.fromEntries(
  Object.entries({
    create: workOrderCreateSchema,
    assignment: workOrderAssignmentSchema,
    transition: workOrderTransitionSchema,
    order: workOrderSchema,
    detail: workOrderDetailSchema,
    page: workOrderPageSchema,
    options: workOrderOptionsSchema,
  }).map(([key, schema]) => [key, z.toJSONSchema(schema, { target: "openapi-3.0" })]),
);
