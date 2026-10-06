import { createIntegrationTracer, type IntegrationTracer } from "@ice24/observability";

/** Nest token of the API integration tracer (F5-14), provided by the integration-logs module. */
export const INTEGRATION_TRACER = Symbol("INTEGRATION_TRACER");

/**
 * Tracer without a store: metrics and failure logs only. Default for adapters built outside
 * Nest (tests, scripts) so they never need a database to run.
 */
export const metricsOnlyTracer = (): IntegrationTracer =>
  createIntegrationTracer({
    service: "api",
    environment: process.env.NODE_ENV ?? "development",
    sink: null,
  });
