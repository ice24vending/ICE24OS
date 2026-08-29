import {
  context,
  metrics,
  propagation,
  SpanStatusCode,
  trace,
  type Attributes,
  type Context,
  type TextMapGetter,
} from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";

export interface TelemetryOptions {
  readonly enabled: boolean;
  readonly endpoint: string | undefined;
  readonly environment: string;
  readonly serviceName: string;
}

export interface TelemetryRuntime {
  readonly enabled: boolean;
  readonly shutdown: () => Promise<void>;
}

export type TraceCarrier = Record<string, string>;

const carrierGetter: TextMapGetter<TraceCarrier> = {
  get: (carrier, key) => carrier[key],
  keys: (carrier) => Object.keys(carrier),
};

const validateCollectorEndpoint = (endpoint: string): URL => {
  const url = new URL(endpoint);
  const isLocal = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) {
    throw new Error("The OTLP endpoint must use HTTPS except on localhost");
  }
  return url;
};

const signalUrl = (base: URL, signal: "traces" | "metrics"): string => {
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/v1/${signal}`;
  return url.toString();
};

export const startTelemetry = (options: TelemetryOptions): TelemetryRuntime => {
  if (!options.enabled) {
    return { enabled: false, shutdown: async () => undefined };
  }
  if (options.endpoint === undefined) {
    throw new Error("An OTLP endpoint is required when telemetry is enabled");
  }

  const endpoint = validateCollectorEndpoint(options.endpoint);
  process.env.OTEL_RESOURCE_ATTRIBUTES = [
    process.env.OTEL_RESOURCE_ATTRIBUTES,
    `deployment.environment.name=${options.environment}`,
  ]
    .filter(Boolean)
    .join(",");

  const sdk = new NodeSDK({
    serviceName: options.serviceName,
    traceExporter: new OTLPTraceExporter({ url: signalUrl(endpoint, "traces") }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: signalUrl(endpoint, "metrics") }),
      exportIntervalMillis: 60_000,
      exportTimeoutMillis: 10_000,
    }),
  });
  sdk.start();

  return { enabled: true, shutdown: async () => sdk.shutdown() };
};

export const injectTraceContext = (carrier: TraceCarrier = {}): TraceCarrier => {
  propagation.inject(context.active(), carrier);
  return carrier;
};

export const extractTraceContext = (carrier: TraceCarrier): Context =>
  propagation.extract(context.active(), carrier, carrierGetter);

export const runInExtractedTrace = async <T>(
  carrier: TraceCarrier,
  operation: () => Promise<T>,
): Promise<T> => context.with(extractTraceContext(carrier), operation);

export const observeHttpServerRequest = (
  options: {
    readonly carrier: TraceCarrier;
    readonly method: string;
    readonly serviceName: string;
  },
  registerCompletion: (complete: (statusCode: number) => void) => void,
  next: () => void,
): void => {
  context.with(extractTraceContext(options.carrier), () => {
    trace.getTracer(options.serviceName).startActiveSpan("http.request", (span) => {
      const startedAt = performance.now();
      const attributes: Attributes = { "http.request.method": options.method };
      span.setAttributes(attributes);
      registerCompletion((statusCode) => {
        const completedAttributes: Attributes = {
          ...attributes,
          "http.response.status_code": statusCode,
        };
        metrics
          .getMeter(options.serviceName)
          .createCounter("http.server.request.count")
          .add(1, completedAttributes);
        metrics
          .getMeter(options.serviceName)
          .createHistogram("http.server.request.duration", { unit: "ms" })
          .record(performance.now() - startedAt, completedAttributes);
        span.setAttributes(completedAttributes);
        span.setStatus({
          code: statusCode >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.OK,
        });
        span.end();
      });
      next();
    });
  });
};

export const traceOperation = async <T>(
  serviceName: string,
  operationName: string,
  operation: () => Promise<T>,
  attributes: Attributes = {},
): Promise<T> =>
  trace.getTracer(serviceName).startActiveSpan(operationName, { attributes }, async (span) => {
    const startedAt = performance.now();
    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      metrics
        .getMeter(serviceName)
        .createHistogram("ice24.operation.duration", { unit: "ms" })
        .record(performance.now() - startedAt, attributes);
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      if (error instanceof Error) span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
