import { metrics, type Meter } from "@opentelemetry/api";
import { writeLog, type LogRecordInput } from "./logging.js";

/** Outcome of one maintenance calendar job (F4-13 generation, F4-21 recalculation). */
export type ScheduleJobOutcome =
  "generated" | "unchanged" | "skipped" | "retried" | "dead_lettered";

export interface ScheduleJobObservation {
  readonly kind: "template" | "recalc";
  readonly outcome: ScheduleJobOutcome;
  readonly durationMs: number;
  readonly correlationId?: string;
  readonly jobId: string;
  readonly machineId: string;
  readonly attempt: number;
  readonly inserted?: number;
  readonly cancelled?: number;
  /** Diagnostic code only (never an error message). */
  readonly errorCode?: string;
}

/**
 * Metrics and logs of calendar jobs: `ice24.schedule.jobs` {kind, outcome},
 * `ice24.schedule.job.duration` (ms) {kind, outcome}, `ice24.schedule.activities` {kind, change}
 * and `ice24.schedule.failures` {kind, error_code}. Attributes carry identifiers and codes only.
 */
export interface ScheduleObserver {
  jobFinished(observation: ScheduleJobObservation): void;
}

export interface ScheduleObserverOptions {
  readonly service: string;
  readonly environment: string;
  readonly meter?: Meter;
  readonly log?: (record: LogRecordInput) => void;
}

const LEVELS: Record<ScheduleJobOutcome, LogRecordInput["level"]> = {
  generated: "info",
  unchanged: "info",
  skipped: "info",
  retried: "warn",
  dead_lettered: "error",
};

export function createScheduleObserver(options: ScheduleObserverOptions): ScheduleObserver {
  const meter = options.meter ?? metrics.getMeter(options.service);
  const log = options.log ?? writeLog;
  const jobs = meter.createCounter("ice24.schedule.jobs", {
    description: "Maintenance calendar jobs by kind and outcome",
  });
  const duration = meter.createHistogram("ice24.schedule.job.duration", {
    description: "Duration of maintenance calendar jobs",
    unit: "ms",
  });
  const activities = meter.createCounter("ice24.schedule.activities", {
    description: "Scheduled activities inserted or cancelled by calendar jobs",
  });
  const failures = meter.createCounter("ice24.schedule.failures", {
    description: "Maintenance calendar jobs whose attempt failed",
  });
  return {
    jobFinished(observation) {
      const attributes = { kind: observation.kind, outcome: observation.outcome };
      jobs.add(1, attributes);
      duration.record(observation.durationMs, attributes);
      if (observation.inserted)
        activities.add(observation.inserted, { kind: observation.kind, change: "inserted" });
      if (observation.cancelled)
        activities.add(observation.cancelled, { kind: observation.kind, change: "cancelled" });
      const failed = observation.outcome === "retried" || observation.outcome === "dead_lettered";
      if (failed)
        failures.add(1, { kind: observation.kind, error_code: observation.errorCode ?? "UNKNOWN" });
      log({
        level: LEVELS[observation.outcome],
        service: options.service,
        environment: options.environment,
        module: "schedule",
        outcome:
          observation.outcome === "dead_lettered" ? "failure" : failed ? "degraded" : "success",
        durationMs: observation.durationMs,
        ...(observation.correlationId ? { correlationId: observation.correlationId } : {}),
        ...(observation.errorCode ? { errorCode: observation.errorCode } : {}),
        attributes: {
          event: "schedule_job_finished",
          kind: observation.kind,
          jobOutcome: observation.outcome,
          jobId: observation.jobId,
          machineId: observation.machineId,
          attempt: observation.attempt,
          inserted: observation.inserted ?? 0,
          cancelled: observation.cancelled ?? 0,
        },
      });
    },
  };
}
