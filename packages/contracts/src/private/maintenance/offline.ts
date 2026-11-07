import { z } from "zod";
import { workOrderSchema } from "./work-orders.js";
import { workOrderExecutionSchema } from "./evidence.js";

export const offlineDownloadSchema = z.strictObject({ deviceId: z.uuid() });
export const offlineReleaseSchema = z.strictObject({ reason: z.string().trim().min(5).max(1000) });
export const offlineLeaseSchema = z.object({
  id: z.uuid(),
  deviceId: z.uuid(),
  userId: z.uuid(),
  downloadedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
});
export const offlineOrderPackageSchema = z.strictObject({
  formatVersion: z.literal(1),
  accountId: z.uuid(),
  userId: z.uuid(),
  order: workOrderSchema,
  lease: offlineLeaseSchema,
  execution: workOrderExecutionSchema.nullable(),
  policy: z.literal("F7-D03-proposal"),
});
export const offlineSyncOperationSchema = z.strictObject({
  id: z.uuid(),
  orderId: z.uuid(),
  leaseId: z.uuid(),
  deviceId: z.uuid(),
  expectedVersion: z.number().int().positive(),
  action: z.enum(["save", "close"]),
  execution: workOrderExecutionSchema,
});
export const offlineSyncResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("accepted"), order: workOrderSchema }),
  z.object({
    status: z.enum(["retryable_error", "permanent_error", "conflict"]),
    message: z.string(),
  }),
]);
export type OfflineOrderPackage = z.infer<typeof offlineOrderPackageSchema>;
export type OfflineSyncOperation = z.infer<typeof offlineSyncOperationSchema>;
export type OfflineSyncResult = z.infer<typeof offlineSyncResultSchema>;
export const offlineSessionSchema = z.object({
  contextId: z.uuid(),
  csrfToken: z.string().min(1),
  accountId: z.uuid(),
  userId: z.uuid(),
});
export const offlinePhotoOperationSchema = z.strictObject({
  localId: z.uuid(),
  machineId: z.uuid(),
  fileName: z.string(),
  mediaType: z.string(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});
export const synchronizationOpenApi = Object.fromEntries(
  Object.entries({
    download: offlineDownloadSchema,
    release: offlineReleaseSchema,
    package: offlineOrderPackageSchema,
    operation: offlineSyncOperationSchema,
    result: offlineSyncResultSchema,
  }).map(([name, schema]) => [name, z.toJSONSchema(schema, { target: "openapi-3.0" })]),
);
