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
}

export interface LogRecord extends LogRecordInput {
  readonly timestamp: string;
  readonly correlationId: string;
}

export const createCorrelationId = (): string => randomUUID();

export const createLogRecord = (input: LogRecordInput, now = new Date()): LogRecord => ({
  ...input,
  correlationId: input.correlationId ?? createCorrelationId(),
  timestamp: now.toISOString(),
});

export const pseudonymizeIdentifier = (identifier: string, salt: string): string =>
  createHash("sha256").update(salt).update(identifier).digest("hex").slice(0, 16);
