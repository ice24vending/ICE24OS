import { z } from "zod";
import { workOrderSchema } from "./work-orders.js";
import { workOrderExecutionSchema } from "./evidence.js";
import { offlineSyncOperationSchema } from "./offline.js";

export const conflictFields = [
  "checklist",
  "fields",
  "diagnosis",
  "activitiesPerformed",
  "parts",
  "tests",
  "recommendation",
  "evidence",
  "result",
  "followup",
] as const;
export const conflictFieldSchema = z.enum(conflictFields);
export const conflictResolutionSchema = z
  .strictObject({
    strategy: z.enum(["server", "local", "combine"]),
    choices: z.record(conflictFieldSchema, z.enum(["server", "local"])).optional(),
    reason: z.string().trim().min(5).max(1000),
    confirmed: z.literal(true),
  })
  .refine((v) => v.strategy !== "combine" || !!v.choices, "Selecciona el origen de cada campo.");
export const synchronizationConflictSchema = z.object({
  id: z.uuid(),
  accountId: z.uuid(),
  orderId: z.uuid(),
  actorId: z.uuid(),
  deviceId: z.uuid(),
  createdAt: z.iso.datetime(),
  local: offlineSyncOperationSchema,
  server: z.object({
    order: workOrderSchema,
    execution: workOrderExecutionSchema.nullable(),
    actorId: z.uuid().nullable(),
    capturedAt: z.iso.datetime(),
  }),
  current: z
    .object({ order: workOrderSchema, execution: workOrderExecutionSchema.nullable() })
    .optional(),
  fields: z.array(conflictFieldSchema),
  state: z.enum(["conflict", "resolved"]),
  resolution: z
    .object({
      actorId: z.uuid(),
      reason: z.string(),
      strategy: z.enum(["server", "local", "combine"]),
      orderVersion: z.number().int(),
      resolvedAt: z.iso.datetime(),
    })
    .nullable(),
});
export type SynchronizationConflict = z.infer<typeof synchronizationConflictSchema>;
export type ConflictResolution = z.infer<typeof conflictResolutionSchema>;
export function conflictExecution(
  conflict: {
    local: Pick<SynchronizationConflict["local"], "execution">;
    server: Pick<SynchronizationConflict["server"], "execution">;
    current?: Pick<NonNullable<SynchronizationConflict["current"]>, "execution"> | undefined;
  },
  resolution: ConflictResolution,
) {
  const local = conflict.local.execution,
    server = (conflict.current ?? conflict.server).execution;
  if (resolution.strategy === "local") return structuredClone(local);
  if (!server) throw new Error("No existe una ejecución del servidor para conservar o combinar.");
  if (resolution.strategy === "server") return structuredClone(server);
  const choices = resolution.choices;
  if (!choices || conflictFields.some((field) => !choices[field]))
    throw new Error("Selecciona el origen de todos los campos.");
  return workOrderExecutionSchema.parse(
    Object.fromEntries(
      conflictFields.map((field) => [
        field,
        choices[field] === "local" ? local[field] : server[field],
      ]),
    ),
  );
}
