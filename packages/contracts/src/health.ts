import { z } from "zod";

export const healthCheckSchema = z.object({
  durationMs: z.number().nonnegative().optional(),
  name: z.string().min(1),
  reason: z.string().min(1).optional(),
  status: z.enum(["ok", "degraded"]),
});

export const healthResponseSchema = z.object({
  checks: z.array(healthCheckSchema),
  service: z.string().min(1),
  status: z.enum(["ok", "degraded"]),
  timestamp: z.iso.datetime({ offset: true }),
});

export type HealthCheck = z.infer<typeof healthCheckSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
