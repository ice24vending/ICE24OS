import { z } from "zod";

export const idempotencyKeySchema = z.string().trim().min(16).max(128);

export const idempotencyRecordSchema = z.object({
  key: idempotencyKeySchema,
  requestHash: z.string().min(32),
  state: z.enum(["processing", "completed", "failed"]),
  responseStatus: z.number().int().min(100).max(599).optional(),
});

export type IdempotencyRecord = z.infer<typeof idempotencyRecordSchema>;
