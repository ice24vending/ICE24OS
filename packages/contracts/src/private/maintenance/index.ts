import { z } from "zod";
export * from "./tickets.js";
export * from "./work-orders.js";
export * from "./evidence.js";
export * from "./offline.js";

export const maintenanceStateSchema = z.enum([
  "scheduled",
  "upcoming",
  "overdue",
  "critical",
  "in_progress",
  "completed",
  "cancelled",
]);
export const scheduledActivitySchema = z.object({
  id: z.uuid(),
  machineId: z.uuid(),
  branchId: z.uuid(),
  machineCode: z.string(),
  machineName: z.string(),
  branchName: z.string(),
  activityCode: z.string(),
  name: z.string(),
  state: maintenanceStateSchema,
  dueAt: z.iso.datetime().nullable(),
  alertAt: z.iso.datetime().nullable(),
  timezone: z.string(),
  assigneeId: z.uuid().nullable(),
  rowVersion: z.number().int().positive(),
});
export const maintenanceQuerySchema = z.object({
  state: maintenanceStateSchema.optional(),
  machineId: z.uuid().optional(),
  branchId: z.uuid().optional(),
  assigneeId: z.union([z.uuid(), z.literal("unassigned")]).optional(),
  period: z.literal("next7days").optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const maintenancePageSchema = z.object({
  items: z.array(scheduledActivitySchema),
  nextCursor: z.uuid().nullable(),
});
export const maintenanceSummarySchema = z.object({
  upcoming: z.number().int().nonnegative(),
  asOf: z.iso.datetime(),
});
export type ScheduledActivity = z.infer<typeof scheduledActivitySchema>;
export type MaintenanceQuery = z.infer<typeof maintenanceQuerySchema>;
export type MaintenanceState = z.infer<typeof maintenanceStateSchema>;
export const maintenanceOpenApi = {
  page: z.toJSONSchema(maintenancePageSchema, { target: "openapi-3.0" }),
  summary: z.toJSONSchema(maintenanceSummarySchema, { target: "openapi-3.0" }),
};
