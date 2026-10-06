import type { Pool } from "pg";
import {
  consumerFailureCodeSchema,
  scheduledTaskMessageSchema,
  scheduledTaskNameSchema,
  type ScheduledTaskBatchSummary,
  type ScheduledTaskMessage,
  type SchedulerTickSummary,
  type TaskSchedule,
} from "@ice24/contracts";
import type { SchedulerObserver } from "@ice24/observability";
import { dueWindows, validateSchedule } from "./windows.js";

export const SCHEDULED_TASKS_QUEUE = "scheduled_tasks";
/** Above any queue policy maximum: infra.fail_job routes the message straight to the DLQ. */
const POISON_ATTEMPT = 1_000;
/** Matches the `scheduled_tasks` visibility timeout: a crashed worker's window reappears after it. */
export const DEFAULT_LEASE_SECONDS = 300;

export interface ScheduledTaskContext {
  readonly task: string;
  readonly windowId: string;
  readonly windowStart: Date;
  readonly windowEnd: Date;
  readonly timeZone: string;
  readonly correlationId: string;
  readonly pool: Pool;
  /**
   * Extends the lease between units of work. Throws LeaseLostError when another worker took the
   * window over; the handler must then stop (its committed items stay applied).
   */
  heartbeat(): Promise<void>;
}

/**
 * A declarative scheduled task. The handler returns counters for the window record. Every
 * effect must be idempotent by item and validate the current state, because a window can run
 * again after a retry, a manual re-queue or a crash in the middle of its execution.
 */
export interface ScheduledTask {
  readonly name: string;
  readonly schedule: TaskSchedule;
  readonly timeZone: string;
  /** Most recent missed windows run after an outage or pause; older ones count as skipped. */
  readonly catchUpWindows: number;
  handle(context: ScheduledTaskContext): Promise<Record<string, number>>;
}

/** Throw to report a diagnostic code; any other error is recorded as HANDLER_FAILED. */
export class ScheduledTaskFailure extends Error {
  public constructor(public readonly code: string) {
    super(code);
    this.name = "ScheduledTaskFailure";
  }
}

export class LeaseLostError extends Error {
  public constructor() {
    super("SCHEDULER_LEASE_LOST");
    this.name = "LeaseLostError";
  }
}

export function validateTasks(tasks: readonly ScheduledTask[]): void {
  const names = new Set<string>();
  for (const task of tasks) {
    scheduledTaskNameSchema.parse(task.name);
    if (names.has(task.name)) throw new Error(`Duplicate scheduled task ${task.name}`);
    if (!Number.isInteger(task.catchUpWindows) || task.catchUpWindows < 1)
      throw new Error(`Invalid catch-up of ${task.name}`);
    validateSchedule(task.schedule, task.timeZone);
    names.add(task.name);
  }
}

export const taskFailureCode = (error: unknown): string => {
  const code = error instanceof ScheduledTaskFailure ? error.code : undefined;
  return code !== undefined && consumerFailureCodeSchema.safeParse(code).success
    ? code
    : "HANDLER_FAILED";
};

/**
 * Enqueues every due window of the registry. Any number of workers may tick at once: the
 * unique (task, window) row in `infra.scheduler_enqueue` lets exactly one of them create the
 * window, its job and its queue message. Also records the task-scheduler heartbeat.
 */
export async function runSchedulerTick(
  pool: Pool,
  tasks: readonly ScheduledTask[],
  options: { readonly now?: Date; readonly observer?: SchedulerObserver } = {},
): Promise<SchedulerTickSummary> {
  validateTasks(tasks);
  const now = options.now ?? new Date();
  const summary: SchedulerTickSummary = {
    tasks: tasks.length,
    enqueued: 0,
    existing: 0,
    paused: 0,
    skipped: 0,
  };
  await pool.query("select infra.record_task_scheduler_heartbeat()");
  for (const task of tasks) {
    const last = await pool.query<{ last_end: Date | null }>(
      "select max(window_end) as last_end from infra.scheduler_windows where task_name=$1",
      [task.name],
    );
    const due = dueWindows(
      task.schedule,
      task.timeZone,
      now,
      last.rows[0]?.last_end ?? null,
      task.catchUpWindows,
    );
    let stopped: "PAUSED" | "EARLY" | undefined;
    for (const window of due.windows) {
      const result = await pool.query<{ outcome: "ENQUEUED" | "EXISTS" | "PAUSED" | "EARLY" }>(
        "select infra.scheduler_enqueue($1,$2,$3,$4,$5) as outcome",
        [task.name, window.key, window.start, window.end, task.timeZone],
      );
      const outcome = result.rows[0]?.outcome;
      if (outcome === "PAUSED" || outcome === "EARLY") {
        stopped = outcome;
        break;
      }
      if (outcome === "ENQUEUED") summary.enqueued += 1;
      else summary.existing += 1;
    }
    // Paused windows are not recorded (on resume the catch-up limit decides what runs). EARLY
    // means the worker clock is ahead of the database: the next tick enqueues and counts them.
    if (stopped === "PAUSED") summary.paused += 1;
    if (stopped !== undefined) continue;
    summary.skipped += due.skipped;
    options.observer?.windowsSkipped(task.name, due.skipped);
  }
  return summary;
}

interface QueueMessage {
  msg_id: string;
  read_ct: number;
  message: unknown;
}

export interface ScheduledTaskOptions {
  /** Identity of this worker process for leases; a new UUID per process. */
  readonly owner: string;
  readonly leaseSeconds?: number;
  readonly batchSize?: number;
  readonly observer?: SchedulerObserver;
}

/**
 * Consumes one batch of `scheduled_tasks`. Delivery is at least once and windows never overlap:
 * - `infra.scheduler_run_start` takes a lease on the window under a row lock: DONE when it
 *   already succeeded (acknowledged without running), BUSY when another worker holds a valid
 *   lease (message left for later), RUN otherwise, including a takeover after a crash;
 * - the handler runs outside that transaction and renews the lease between units of work;
 * - success stores the counters, finishes the job and acknowledges the message;
 * - a failure asks `infra.fail_job` for the backoff retry or the DLQ and records it on the
 *   window and its SCHEDULED_TASK job, where support can re-queue it (INT-004);
 * - a lost lease records nothing: the worker that took the window over owns its outcome.
 */
export async function processScheduledTasks(
  pool: Pool,
  tasks: readonly ScheduledTask[],
  options: ScheduledTaskOptions,
): Promise<ScheduledTaskBatchSummary> {
  validateTasks(tasks);
  const leaseSeconds = options.leaseSeconds ?? DEFAULT_LEASE_SECONDS;
  const registry = new Map(tasks.map((task) => [task.name, task]));
  const summary: ScheduledTaskBatchSummary = {
    received: 0,
    succeeded: 0,
    duplicates: 0,
    busy: 0,
    leaseLost: 0,
    retried: 0,
    deadLettered: 0,
  };
  const batch = await pool.query<QueueMessage>(
    "select msg_id, read_ct, message from infra.read_queue($1,$2,$3)",
    [SCHEDULED_TASKS_QUEUE, leaseSeconds, options.batchSize ?? 5],
  );
  for (const delivery of batch.rows) {
    summary.received += 1;
    const started = Date.now();
    const parsed = scheduledTaskMessageSchema.safeParse(delivery.message);
    const task = parsed.success ? registry.get(parsed.data.task) : undefined;
    if (!parsed.success || task === undefined) {
      // An unknown task is not retried: its code is not deployed in this worker.
      await poison(pool, delivery, parsed.success ? "SCHEDULED_TASK_UNKNOWN" : "INVALID_MESSAGE");
      summary.deadLettered += 1;
      continue;
    }
    const message = parsed.data;
    const start = await pool.query<{
      action: "RUN" | "DONE" | "BUSY" | "MISSING";
      recovered: boolean;
    }>("select * from infra.scheduler_run_start($1,$2,$3,$4,$5,$6,$7)", [
      message.jobId,
      message.windowId,
      SCHEDULED_TASKS_QUEUE,
      delivery.msg_id,
      delivery.read_ct,
      options.owner,
      leaseSeconds,
    ]);
    const action = start.rows[0]?.action ?? "MISSING";
    const observe = (
      outcome: Parameters<SchedulerObserver["runFinished"]>[0]["outcome"],
      errorCode?: string,
    ) =>
      options.observer?.runFinished({
        task: task.name,
        outcome,
        durationMs: Date.now() - started,
        correlationId: message.correlationId,
        recovered: start.rows[0]?.recovered === true,
        ...(errorCode ? { errorCode } : {}),
      });
    if (action === "MISSING") {
      await poison(pool, delivery, "SCHEDULED_WINDOW_NOT_FOUND");
      summary.deadLettered += 1;
      continue;
    }
    if (action === "DONE") {
      await pool.query("select infra.ack_message($1,$2)", [SCHEDULED_TASKS_QUEUE, delivery.msg_id]);
      await pool.query("select infra.job_finish($1,'succeeded',null)", [message.jobId]);
      summary.duplicates += 1;
      observe("duplicate");
      continue;
    }
    if (action === "BUSY") {
      summary.busy += 1;
      observe("busy");
      continue;
    }
    try {
      const result = await task.handle(
        context(pool, message, delivery, options.owner, leaseSeconds),
      );
      const finished = await pool.query<{ outcome: string }>(
        "select infra.scheduler_run_finish($1,$2,$3,$4) as outcome",
        [message.windowId, message.jobId, options.owner, JSON.stringify(counters(result))],
      );
      if (finished.rows[0]?.outcome === "LEASE_LOST") throw new LeaseLostError();
      await pool.query("select infra.ack_message($1,$2)", [SCHEDULED_TASKS_QUEUE, delivery.msg_id]);
      summary.succeeded += 1;
      observe("succeeded");
    } catch (error) {
      if (error instanceof LeaseLostError) {
        summary.leaseLost += 1;
        observe("lease_lost");
        continue;
      }
      const code = taskFailureCode(error);
      const failed = await pool.query<{ outcome: "retry_scheduled" | "dead_lettered" }>(
        "select infra.fail_job($1,$2,$3,$4,$5) as outcome",
        [
          SCHEDULED_TASKS_QUEUE,
          delivery.msg_id,
          JSON.stringify(delivery.message),
          delivery.read_ct,
          code,
        ],
      );
      const outcome = failed.rows[0]?.outcome ?? "retry_scheduled";
      await pool.query("select infra.scheduler_run_fail($1,$2,$3,$4,$5)", [
        message.windowId,
        message.jobId,
        options.owner,
        outcome,
        code,
      ]);
      if (outcome === "dead_lettered") summary.deadLettered += 1;
      else summary.retried += 1;
      observe(outcome === "dead_lettered" ? "dead_lettered" : "retried", code);
    }
  }
  return summary;
}

function context(
  pool: Pool,
  message: ScheduledTaskMessage,
  delivery: QueueMessage,
  owner: string,
  leaseSeconds: number,
): ScheduledTaskContext {
  return {
    task: message.task,
    windowId: message.windowId,
    windowStart: new Date(message.windowStart),
    windowEnd: new Date(message.windowEnd),
    timeZone: message.timeZone,
    correlationId: message.correlationId,
    pool,
    async heartbeat() {
      const renewed = await pool.query<{ renewed: boolean }>(
        "select infra.scheduler_renew_lease($1,$2,$3,$4,$5) as renewed",
        [message.windowId, owner, leaseSeconds, SCHEDULED_TASKS_QUEUE, delivery.msg_id],
      );
      if (renewed.rows[0]?.renewed !== true) throw new LeaseLostError();
    },
  };
}

/** Window results keep non-negative integer counters only. */
const counters = (result: Record<string, number>): Record<string, number> =>
  Object.fromEntries(
    Object.entries(result).filter(
      ([key, value]) =>
        /^[a-z][A-Za-z0-9]{0,39}$/u.test(key) && Number.isSafeInteger(value) && value >= 0,
    ),
  );

async function poison(pool: Pool, delivery: QueueMessage, code: string): Promise<void> {
  await pool.query("select infra.fail_job($1,$2,$3,$4,$5)", [
    SCHEDULED_TASKS_QUEUE,
    delivery.msg_id,
    JSON.stringify(delivery.message ?? null),
    POISON_ATTEMPT,
    code,
  ]);
  await pool.query("select infra.job_record_poison($1,$2,$3)", [
    SCHEDULED_TASKS_QUEUE,
    delivery.msg_id,
    code,
  ]);
}
