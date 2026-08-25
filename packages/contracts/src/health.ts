import { z } from "zod";

export const healthResponseSchema = z.object({
  service: z.string().min(1),
  status: z.literal("ok"),
  timestamp: z.iso.datetime({ offset: true }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
