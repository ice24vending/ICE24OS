import { z } from "zod";

export const deploymentEnvironmentSchema = z.enum(["development", "test", "staging", "production"]);

const optionalUrlSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);

const booleanFromEnvironmentSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false" || value === "") return false;
  return value;
}, z.boolean());

export const serviceConfigSchema = z
  .object({
    HOST: z.string().trim().min(1).default("127.0.0.1"),
    NODE_ENV: deploymentEnvironmentSchema.default("development"),
    OTEL_ENABLED: booleanFromEnvironmentSchema.default(false),
    OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrlSchema,
    PORT: z.coerce.number().int().min(1).max(65_535),
    SERVICE_NAME: z.string().trim().min(1),
    SUPABASE_URL: optionalUrlSchema,
  })
  .superRefine((config, context) => {
    if (config.OTEL_ENABLED && config.OTEL_EXPORTER_OTLP_ENDPOINT === undefined) {
      context.addIssue({
        code: "custom",
        message: "OTEL_EXPORTER_OTLP_ENDPOINT is required when OTEL_ENABLED is true",
        path: ["OTEL_EXPORTER_OTLP_ENDPOINT"],
      });
    }

    if (
      (config.NODE_ENV === "staging" || config.NODE_ENV === "production") &&
      config.SUPABASE_URL === undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "SUPABASE_URL is required in staging and production",
        path: ["SUPABASE_URL"],
      });
    }
  });

export type ServiceConfig = z.infer<typeof serviceConfigSchema>;
export type DeploymentEnvironment = z.infer<typeof deploymentEnvironmentSchema>;

export const parseServiceConfig = (input: unknown): ServiceConfig =>
  serviceConfigSchema.parse(input);
