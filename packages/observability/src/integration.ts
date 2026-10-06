import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { metrics, type Meter } from "@opentelemetry/api";
import { writeLog, type LogRecordInput } from "./logging.js";

/**
 * F5-14 integration logs: one record per call to, or delivery from, an external system, with
 * the correlation that travels HTTP request → outbox → queue → worker → provider → webhook.
 * Mirrors `@ice24/contracts` integration-logs (kept local: this package has no contract import).
 */
export type IntegrationName =
  "stripe" | "email" | "object_storage" | "queue" | "antimalware" | "pdf";
export type IntegrationDirection = "OUTBOUND" | "INBOUND";
export type IntegrationStatus = "SUCCEEDED" | "FAILED";
export type IntegrationDetailValue = string | number | boolean | null;

/**
 * Correlation scope of the current request or queue delivery. The API sets it per HTTP request
 * and each worker processor per delivery, so adapters record without new parameters.
 */
export interface IntegrationContext {
  readonly correlationId?: string;
  /** Correlation of the HTTP delivery when an inbound call resumes an older correlation. */
  readonly requestCorrelationId?: string | null;
  readonly accountId?: string | null;
  /** Delivery attempt (queue `read_ct`, webhook delivery count). */
  readonly attempt?: number;
  readonly jobId?: string | null;
}

const scope = new AsyncLocalStorage<IntegrationContext>();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
export const isCorrelationId = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);

/** Runs `work` with `context` merged over the enclosing one. */
export function withIntegrationContext<T>(context: IntegrationContext, work: () => T): T {
  const defined = Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined),
  ) as IntegrationContext;
  return scope.run({ ...scope.getStore(), ...defined }, work);
}

export const currentIntegrationContext = (): IntegrationContext => scope.getStore() ?? {};

/** `x-correlation-id` for outbound HTTP calls made inside the current scope. */
export const correlationHeaders = (): Record<string, string> => {
  const id = scope.getStore()?.correlationId;
  return isCorrelationId(id) ? { "x-correlation-id": id } : {};
};

export interface IntegrationLogEntry {
  readonly integration: IntegrationName;
  readonly operation: string;
  readonly direction: IntegrationDirection;
  readonly provider: string;
  readonly status: IntegrationStatus;
  readonly latencyMs: number;
  readonly responseCode: string | null;
  readonly errorCode: string | null;
  readonly retryable: boolean | null;
  readonly attempt: number;
  /** Identity of the effect (idempotency key, message id, object); with `attempt`, unique. */
  readonly effectKey: string | null;
  readonly correlationId: string;
  readonly requestCorrelationId: string | null;
  readonly accountId: string | null;
  readonly jobId: string | null;
  readonly details: Readonly<Record<string, IntegrationDetailValue>>;
  readonly occurredAt: Date;
}

/** Durable store of integration logs. Implementations must be idempotent per effect + attempt. */
export interface IntegrationLogSink {
  record(entry: IntegrationLogEntry): Promise<void>;
}

// Never stored: credentials, card data, file content, addresses or anything URL-like.
const FORBIDDEN_KEY =
  /authorization|cookie|password|passwd|secret|token|api[-_]?key|email|phone|card|pan$|cvc|cvv|iban|signature|content|body|payload|url|uri|address|^raw/iu;
const KEY = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/u;
const REPLACEMENTS: readonly [RegExp, string][] = [
  [/\b[a-z][a-z0-9+.-]*:\/\/\S+/giu, "[URL]"],
  [/\/(?:storage\/v1\/)?object\/(?:upload\/)?sign\/\S+/giu, "[URL]"],
  [/bearer\s+\S+/giu, "[TOKEN]"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/gu, "[TOKEN]"],
  [/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]+|\bwhsec_[A-Za-z0-9]+/gu, "[SECRET]"],
  [/[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/giu, "[EMAIL]"],
];
const MAX_KEYS = 20;
const MAX_VALUE = 200;
// A UUID is matched first so its digit groups are never taken for a card number.
const UUID_OR_CARD =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b(?:\d[ -]?){12,18}\d\b/giu;

const ANY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** Luhn check: payment card numbers pass it; identifiers and timestamps almost never do. */
const luhn = (digits: string): boolean => {
  let sum = 0;
  for (let index = 0; index < digits.length; index++) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
    sum += digit;
  }
  return sum % 10 === 0;
};

/** Card-like numbers (13–19 digits passing Luhn); UUIDs are left intact for diagnosis. */
const redactCards = (value: string): string =>
  value.replaceAll(UUID_OR_CARD, (match) =>
    !ANY_UUID.test(match) && luhn(match.replaceAll(/[ -]/gu, "")) ? "[CARD]" : match,
  );

/** Redacted string: URLs, tokens, secrets, card numbers and addresses are replaced. */
export const redactIntegrationValue = (value: string): string =>
  redactCards(
    REPLACEMENTS.reduce((text, [pattern, mask]) => text.replaceAll(pattern, mask), value),
  ).slice(0, MAX_VALUE);

/**
 * Flat, allow-listed details: at most 20 scalar values under safe keys. Objects, arrays,
 * buffers and forbidden keys are dropped; strings are redacted and truncated.
 */
export function redactIntegrationDetails(
  details: Readonly<Record<string, unknown>> | undefined,
): Record<string, IntegrationDetailValue> {
  const safe: Record<string, IntegrationDetailValue> = {};
  for (const [key, value] of Object.entries(details ?? {})) {
    if (Object.keys(safe).length >= MAX_KEYS) break;
    if (!KEY.test(key) || FORBIDDEN_KEY.test(key)) continue;
    if (typeof value === "string") safe[key] = redactIntegrationValue(value);
    else if (typeof value === "number" && Number.isFinite(value)) safe[key] = value;
    else if (typeof value === "boolean" || value === null) safe[key] = value;
  }
  return safe;
}

const CODE = /^[A-Z][A-Z0-9_]{1,79}$/u;
const RESPONSE_CODE = /^[A-Za-z0-9_.:-]{1,40}$/u;
const OPERATION = /^[a-z][a-z0-9_.:-]{1,79}$/u;
const PROVIDER = /^[a-z][a-z0-9-]{1,39}$/u;

export interface IntegrationOutcome {
  readonly responseCode?: string | number | null;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface IntegrationFailure extends IntegrationOutcome {
  /** Diagnostic code (`PROVIDER_TIMEOUT`); never an error message. */
  readonly errorCode: string;
  readonly retryable?: boolean | null;
}

export interface IntegrationCall<T> {
  readonly integration: IntegrationName;
  readonly operation: string;
  readonly provider: string;
  readonly direction?: IntegrationDirection;
  readonly effectKey?: string | null;
  readonly details?: Readonly<Record<string, unknown>>;
  /** Explicit values override the enclosing context. */
  readonly context?: IntegrationContext;
  readonly onSuccess?: (result: T) => IntegrationOutcome | undefined;
  readonly onError?: (error: unknown) => IntegrationFailure;
}

export interface IntegrationTracer {
  /** Runs an outbound call, records its outcome and returns or rethrows the original result. */
  trace<T>(call: IntegrationCall<T>, work: () => Promise<T>): Promise<T>;
  /** Records a call whose outcome is already known (inbound webhooks, queue deliveries). */
  record(
    call: Omit<IntegrationCall<never>, "onSuccess" | "onError"> & {
      readonly status: IntegrationStatus;
      readonly latencyMs: number;
      readonly responseCode?: string | number | null;
      readonly errorCode?: string | null;
      readonly retryable?: boolean | null;
    },
  ): Promise<void>;
}

export interface IntegrationTracerOptions {
  readonly service: string;
  readonly environment: string;
  /** Null keeps metrics and logs only (e.g. no database configured). */
  readonly sink: IntegrationLogSink | null;
  readonly meter?: Meter;
  readonly log?: (record: LogRecordInput) => void;
  readonly now?: () => Date;
}

const defaultFailure = (): IntegrationFailure => ({ errorCode: "INTEGRATION_FAILED" });

/**
 * Common wrapper for every adapter (Stripe, email, object storage, queue, antimalware, PDF).
 * Metrics `ice24.integration.calls` {integration, operation, status} and
 * `ice24.integration.duration` (ms); failures also log a warning. A store failure never breaks
 * the integration call: it is counted (`ice24.integration.log_failures`) and logged.
 */
export function createIntegrationTracer(options: IntegrationTracerOptions): IntegrationTracer {
  const meter = options.meter ?? metrics.getMeter(options.service);
  const log = options.log ?? writeLog;
  const now = options.now ?? (() => new Date());
  const calls = meter.createCounter("ice24.integration.calls", {
    description: "Integration calls by outcome",
  });
  const duration = meter.createHistogram("ice24.integration.duration", {
    description: "Duration of integration calls",
    unit: "ms",
  });
  const storeFailures = meter.createCounter("ice24.integration.log_failures", {
    description: "Integration log records that could not be stored",
  });

  const entry = (
    call: Omit<IntegrationCall<never>, "onSuccess" | "onError">,
    outcome: {
      status: IntegrationStatus;
      latencyMs: number;
      responseCode?: string | number | null | undefined;
      errorCode?: string | null | undefined;
      retryable?: boolean | null | undefined;
      details?: Readonly<Record<string, unknown>> | undefined;
    },
  ): IntegrationLogEntry => {
    const context = { ...currentIntegrationContext(), ...(call.context ?? {}) };
    const responseCode =
      outcome.responseCode === null || outcome.responseCode === undefined
        ? null
        : String(outcome.responseCode);
    return {
      integration: call.integration,
      operation: OPERATION.test(call.operation) ? call.operation : "unknown",
      direction: call.direction ?? "OUTBOUND",
      provider: PROVIDER.test(call.provider) ? call.provider : "unknown",
      status: outcome.status,
      latencyMs: Math.max(0, Math.round(outcome.latencyMs)),
      responseCode: responseCode !== null && RESPONSE_CODE.test(responseCode) ? responseCode : null,
      errorCode:
        outcome.status === "FAILED"
          ? outcome.errorCode && CODE.test(outcome.errorCode)
            ? outcome.errorCode
            : "INTEGRATION_FAILED"
          : null,
      retryable: outcome.retryable ?? null,
      attempt:
        Number.isInteger(context.attempt) && (context.attempt ?? 0) >= 1 ? context.attempt! : 1,
      effectKey: call.effectKey ? redactIntegrationValue(call.effectKey) : null,
      correlationId: isCorrelationId(context.correlationId) ? context.correlationId : randomUUID(),
      requestCorrelationId: isCorrelationId(context.requestCorrelationId)
        ? context.requestCorrelationId
        : null,
      accountId: isCorrelationId(context.accountId) ? context.accountId : null,
      jobId: isCorrelationId(context.jobId) ? context.jobId : null,
      details: redactIntegrationDetails({ ...(call.details ?? {}), ...(outcome.details ?? {}) }),
      occurredAt: now(),
    };
  };

  const store = async (record: IntegrationLogEntry): Promise<void> => {
    const attributes = {
      integration: record.integration,
      operation: record.operation,
      status: record.status,
    };
    calls.add(1, attributes);
    duration.record(record.latencyMs, attributes);
    if (record.status === "FAILED")
      log({
        level: "warn",
        service: options.service,
        environment: options.environment,
        module: "integrations",
        outcome: "failure",
        correlationId: record.correlationId,
        durationMs: record.latencyMs,
        errorCode: record.errorCode ?? "INTEGRATION_FAILED",
        attributes: {
          event: "integration_call_failed",
          integration: record.integration,
          operation: record.operation,
          provider: record.provider,
          attempt: record.attempt,
          responseCode: record.responseCode,
        },
      });
    if (!options.sink) return;
    try {
      await options.sink.record(record);
    } catch {
      storeFailures.add(1, { integration: record.integration });
      log({
        level: "warn",
        service: options.service,
        environment: options.environment,
        module: "integrations",
        outcome: "degraded",
        correlationId: record.correlationId,
        errorCode: "INTEGRATION_LOG_UNAVAILABLE",
        attributes: { event: "integration_log_not_stored", integration: record.integration },
      });
    }
  };

  return {
    async trace<T>(call: IntegrationCall<T>, work: () => Promise<T>): Promise<T> {
      const started = performance.now();
      let result: T;
      try {
        result = await work();
      } catch (error) {
        let failure: IntegrationFailure;
        try {
          failure = call.onError?.(error) ?? defaultFailure();
        } catch {
          failure = defaultFailure();
        }
        await store(
          entry(call, { status: "FAILED", latencyMs: performance.now() - started, ...failure }),
        );
        throw error;
      }
      let outcome: IntegrationOutcome | undefined;
      try {
        outcome = call.onSuccess?.(result);
      } catch {
        outcome = undefined;
      }
      await store(
        entry(call, { status: "SUCCEEDED", latencyMs: performance.now() - started, ...outcome }),
      );
      return result;
    },
    async record(call) {
      await store(entry(call, call));
    },
  };
}

/** Minimal client surface shared by `pg` Pool and PoolClient; no driver is bundled here. */
export interface SqlQueryable {
  query(text: string, values?: unknown[]): Promise<unknown>;
}

/**
 * Store in `infra.integration_logs` through `infra.record_integration_log` (migration
 * 20261006000100). The function ignores a repeated (integration, operation, effect, attempt),
 * so a duplicated delivery never duplicates the record of an effect.
 */
export function createSqlIntegrationLogSink(client: SqlQueryable): IntegrationLogSink {
  return {
    async record(entry) {
      await client.query(
        `select infra.record_integration_log($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::uuid,
           $13::uuid,$14::uuid,$15::uuid,$16::jsonb,$17::timestamptz)`,
        [
          entry.integration,
          entry.operation,
          entry.direction,
          entry.provider,
          entry.status,
          entry.latencyMs,
          entry.responseCode,
          entry.errorCode,
          entry.retryable,
          entry.attempt,
          entry.effectKey,
          entry.correlationId,
          entry.requestCorrelationId,
          entry.accountId,
          entry.jobId,
          JSON.stringify(entry.details),
          entry.occurredAt.toISOString(),
        ],
      );
    },
  };
}
