import { z } from "zod";

export const errorCodeSchema = z.enum([
  "AUTHENTICATION_REQUIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "PRECONDITION_FAILED",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
    correlationId: z.string().uuid(),
    timestamp: z.iso.datetime({ offset: true }),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
