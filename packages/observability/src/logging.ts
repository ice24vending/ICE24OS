import { createHash, randomUUID } from "node:crypto";

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface LogRecordInput {
  readonly level: LogLevel;
  readonly service: string;
  readonly environment: string;
  readonly module: string;
  readonly outcome: "success" | "failure" | "degraded";
  readonly correlationId?: string;
  readonly durationMs?: number;
  readonly errorCode?: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

export interface LogRecord extends Omit<LogRecordInput, "attributes"> {
  readonly timestamp: string;
  readonly correlationId: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

const forbiddenAttributePattern =
  /authorization|cookie|password|passwd|secret|token|api[-_]?key|email|phone|file[-_]?content/i;
const bearerPattern = /bearer\s+[a-z0-9._~+/=-]+/gi;

const sanitizeValue = (value: unknown, seen: WeakSet<object>): unknown => {
  if (typeof value === "string") return value.replaceAll(bearerPattern, "[REDACTED]");
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);
    return value.map((item) => sanitizeValue(item, seen));
  }
  if (value !== null && typeof value === "object") {
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !forbiddenAttributePattern.test(key))
        .map(([key, nestedValue]) => [key, sanitizeValue(nestedValue, seen)]),
    );
  }
  return value;
};

export const createCorrelationId = (): string => randomUUID();

export const sanitizeLogAttributes = (
  attributes: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> =>
  Object.fromEntries(
    Object.entries(attributes)
      .filter(([key]) => !forbiddenAttributePattern.test(key))
      .map(([key, value]) => [key, sanitizeValue(value, new WeakSet<object>())]),
  );

export const createLogRecord = (input: LogRecordInput, now = new Date()): LogRecord => {
  const attributes = input.attributes && sanitizeLogAttributes(input.attributes);
  const record: LogRecord = {
    ...input,
    correlationId: input.correlationId ?? createCorrelationId(),
    timestamp: now.toISOString(),
  };

  if (attributes === undefined) return record;
  return { ...record, attributes };
};

export const writeLog = (input: LogRecordInput): void => {
  const record = JSON.stringify(createLogRecord(input));
  if (input.level === "error") {
    console.error(record);
    return;
  }
  if (input.level === "warn") {
    console.warn(record);
    return;
  }
  console.info(record);
};

export const pseudonymizeIdentifier = (identifier: string, salt: string): string =>
  createHash("sha256").update(salt).update(identifier).digest("hex").slice(0, 16);
