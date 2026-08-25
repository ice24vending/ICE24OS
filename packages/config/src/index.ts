import { z } from "zod";

const nodeEnvironmentSchema = z.enum(["development", "test", "staging", "production"]);

export const serviceConfigSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema.default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535),
  SERVICE_NAME: z.string().trim().min(1),
});

export type ServiceConfig = z.infer<typeof serviceConfigSchema>;

export const parseServiceConfig = (input: unknown): ServiceConfig =>
  serviceConfigSchema.parse(input);
