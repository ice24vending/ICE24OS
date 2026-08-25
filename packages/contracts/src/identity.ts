import { z } from "zod";

export const actorSchema = z.object({
  userId: z.string().uuid(),
  identityId: z.string().min(1),
});

export const requestContextSchema = z.object({
  accountId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  correlationId: z.string().uuid(),
});

export type Actor = z.infer<typeof actorSchema>;
export type RequestContext = z.infer<typeof requestContextSchema>;
