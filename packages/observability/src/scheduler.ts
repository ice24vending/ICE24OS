import { metrics, type Meter } from "@opentelemetry/api";
import { writeLog, type LogRecordInput } from "./logging.js";

/** Outcome of one delivery of a scheduled window (F5-13). */
export type ScheduledRunOutcome =
  "succeeded" | "retried" | "dead_lettered" | "duplicate" | "busy" | "lease_lost";

export interface ScheduledRunObservation {
  readonly task: string;
  readonly outcome: ScheduledRunOutcome;
  readonly durationMs: number;
  readonly correlationId?: string;
  /** Diagnostic code only (never an error message). */
  readonly errorCode?: string;
  /** The window was taken over after the previous lease expired (crash recovery). */
  readonly recovered?: boolean;
}

/**
 * Metrics and logs of the scheduler: executions, failures, latency and skipped windows.
 * `ice24.scheduler.runs` {task, outcome}, `ice24.scheduler.failures` {task, error_code},
 * `ice24.scheduler.run.duration` (ms) {task, outcome} and `ice24.scheduler.windows.skipped`
 * {task}. Attributes carry task names and codes only, never payloads or personal data.
 */
export interface SchedulerObserver {
  runFinished(observation: ScheduledRunObservation): void;
  windowsSkipped(task: string, count: number): void;
}

export interface SchedulerObserverOptions {
  readonly service: string;
  readonly environment: string;
  readonly meter?: Meter;
  readonly log?: (record: LogRecordInput) => void;
}

const LEVELS: Record<ScheduledRunOutcome, LogRecordInput["level"]> = {
  succeeded: "info",
  duplicate: "info",
  busy: "debug",
  lease_lost: "warn",
  retried: "warn",
  dead_lettered: "error",
};

export function createSchedulerObserver(options: SchedulerObserverOptions): SchedulerObserver {
  const meter = options.meter ?? metrics.getMeter(options.service);
  const log = options.log ?? writeLog;
  const runs = meter.createCounter("ice24.scheduler.runs", {
    description: "Deliveries of scheduled windows by outcome",
  });
  const failures = meter.createCounter("ice24.scheduler.failures", {
    description: "Scheduled windows whose handler failed",
  });
  const duration = meter.createHistogram("ice24.scheduler.run.duration", {
    description: "Duration of scheduled window deliveries",
    unit: "ms",
  });
  const skipped = meter.createCounter("ice24.scheduler.windows.skipped", {
    description: "Missed windows beyond the catch-up limit of their task",
  });
  return {
    runFinished(observation) {
      const attributes = { task: observation.task, outcome: observation.outcome };
      runs.add(1, attributes);
      duration.record(observation.durationMs, attributes);
      const failed = observation.outcome === "retried" || observation.outcome === "dead_lettered";
      if (failed)
        failures.add(1, { task: observation.task, error_code: observation.errorCode ?? "UNKNOWN" });
      log({
        level: LEVELS[observation.outcome],
        service: options.service,
        environment: options.environment,
        module: "scheduler",
        outcome:
          observation.outcome === "dead_lettered"
            ? "failure"
            : failed || observation.outcome === "lease_lost"
              ? "degraded"
              : "success",
        durationMs: observation.durationMs,
        ...(observation.correlationId ? { correlationId: observation.correlationId } : {}),
        ...(observation.errorCode ? { errorCode: observation.errorCode } : {}),
        attributes: {
          event: "scheduled_task_run",
          task: observation.task,
          runOutcome: observation.outcome,
          recovered: observation.recovered === true,
        },
      });
    },
    windowsSkipped(task, count) {
      if (count <= 0) return;
      skipped.add(count, { task });
      log({
        level: "warn",
        service: options.service,
        environment: options.environment,
        module: "scheduler",
        outcome: "degraded",
        errorCode: "SCHEDULE_WINDOWS_SKIPPED",
        attributes: { event: "scheduled_windows_skipped", task, count },
      });
    },
  };
}
