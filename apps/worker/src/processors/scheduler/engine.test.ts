import type { Pool } from "pg";
import { describe, expect, it } from "vitest";
import type { ScheduledRunObservation, SchedulerObserver } from "@ice24/observability";
import {
  ScheduledTaskFailure,
  processScheduledTasks,
  runSchedulerTick,
  taskFailureCode,
  validateTasks,
  type ScheduledTask,
} from "./engine.js";
import { scheduledTasks } from "./tasks.js";
import { FakeSubscriptionObservationSource } from "./reconciliation.js";

const id = "11111111-1111-4111-8111-111111111111";
const message = (task = "test.task") => ({
  messageVersion: 1,
  jobId: id,
  windowId: id,
  task,
  windowStart: "2026-10-05T10:00:00.000Z",
  windowEnd: "2026-10-05T10:05:00.000Z",
  timeZone: "UTC",
  correlationId: id,
});

type Statement = { text: string; values?: unknown[] | undefined };
const fakePool = (
  responses: {
    deliveries?: unknown[];
    start?: string;
    finish?: string;
    failOutcome?: string;
    enqueue?: string[];
    lastEnd?: Date | null;
  } = {},
) => {
  const statements: Statement[] = [];
  const enqueue = [...(responses.enqueue ?? [])];
  const query = async (text: string, values?: unknown[]) => {
    statements.push({ text, values });
    if (text.includes("infra.read_queue"))
      return {
        rows: (responses.deliveries ?? []).map((m, i) => ({
          msg_id: String(i + 1),
          read_ct: 1,
          message: m,
        })),
      };
    if (text.includes("scheduler_run_start"))
      return { rows: [{ action: responses.start ?? "RUN", recovered: false }] };
    if (text.includes("scheduler_run_finish"))
      return { rows: [{ outcome: responses.finish ?? "SUCCEEDED" }] };
    if (text.includes("infra.fail_job"))
      return { rows: [{ outcome: responses.failOutcome ?? "retry_scheduled" }] };
    if (text.includes("scheduler_renew_lease")) return { rows: [{ renewed: true }] };
    if (text.includes("max(window_end)"))
      return { rows: [{ last_end: responses.lastEnd ?? null }] };
    if (text.includes("scheduler_enqueue"))
      return { rows: [{ outcome: enqueue.shift() ?? "ENQUEUED" }] };
    return { rows: [] };
  };
  return { pool: { query } as unknown as Pool, statements };
};
const sql = (statements: Statement[], fragment: string) =>
  statements.filter((s) => s.text.includes(fragment));
const task = (handle: ScheduledTask["handle"] = async () => ({ items: 1 })): ScheduledTask => ({
  name: "test.task",
  schedule: { kind: "interval", everySeconds: 300 },
  timeZone: "UTC",
  catchUpWindows: 2,
  handle,
});
const recordingObserver = () => {
  const runs: ScheduledRunObservation[] = [];
  const skipped: [string, number][] = [];
  const observer: SchedulerObserver = {
    runFinished: (run) => runs.push(run),
    windowsSkipped: (name, count) => skipped.push([name, count]),
  };
  return { observer, runs, skipped };
};

describe("scheduler engine (F5-13)", () => {
  it("validates the declarative registry", () => {
    expect(() => validateTasks([task(), task()])).toThrow(/Duplicate/u);
    expect(() => validateTasks([{ ...task(), name: "noDots" }])).toThrow();
    expect(() => validateTasks([{ ...task(), timeZone: "local" }])).toThrow();
    expect(() => validateTasks([{ ...task(), catchUpWindows: 0 }])).toThrow(/catch-up/u);
    const registry = scheduledTasks({ observations: null });
    expect(() => validateTasks(registry)).not.toThrow();
    expect(registry.map((t) => t.name)).toEqual([
      "subscriptions.expirations",
      "reports.weekly-period",
      "reports.monthly-period",
      "reports.quarterly-period",
      "reports.yearly-period",
    ]);
    expect(
      scheduledTasks({ observations: new FakeSubscriptionObservationSource() }).at(-1)?.name,
    ).toBe("subscriptions.stripe-reconciliation");
    for (const entry of registry) expect(entry.timeZone).toMatch(/^(UTC|America\/Mexico_City)$/u);
  });

  it("enqueues due windows, records the heartbeat and reports skipped windows", async () => {
    const { pool, statements } = fakePool({
      lastEnd: new Date("2026-10-05T09:00:00Z"),
      enqueue: ["ENQUEUED", "EXISTS"],
    });
    const { observer, skipped } = recordingObserver();
    const summary = await runSchedulerTick(pool, [task()], {
      now: new Date("2026-10-05T10:07:00Z"),
      observer,
    });
    expect(summary).toEqual({ tasks: 1, enqueued: 1, existing: 1, paused: 0, skipped: 11 });
    expect(sql(statements, "record_task_scheduler_heartbeat")).toHaveLength(1);
    expect(sql(statements, "scheduler_enqueue").map((s) => s.values?.[1])).toEqual([
      "2026-10-05T10:00:00.000Z",
      "2026-10-05T10:05:00.000Z",
    ]);
    expect(skipped).toEqual([["test.task", 11]]);
  });

  it("stops at a paused task without counting its windows as skipped", async () => {
    const { pool, statements } = fakePool({
      lastEnd: new Date("2026-10-05T09:00:00Z"),
      enqueue: ["PAUSED"],
    });
    const { observer, skipped } = recordingObserver();
    const summary = await runSchedulerTick(pool, [task()], {
      now: new Date("2026-10-05T10:07:00Z"),
      observer,
    });
    expect(summary).toMatchObject({ enqueued: 0, paused: 1, skipped: 0 });
    expect(sql(statements, "scheduler_enqueue")).toHaveLength(1);
    expect(skipped).toEqual([]);
  });

  it("leaves windows for the next tick when the worker clock is ahead of the database", async () => {
    const { pool } = fakePool({
      lastEnd: new Date("2026-10-05T09:00:00Z"),
      enqueue: ["ENQUEUED", "EARLY"],
    });
    const { observer, skipped } = recordingObserver();
    const summary = await runSchedulerTick(pool, [task()], {
      now: new Date("2026-10-05T10:07:00Z"),
      observer,
    });
    expect(summary).toMatchObject({ enqueued: 1, paused: 0, skipped: 0 });
    expect(skipped).toEqual([]);
  });

  it("runs the handler with the lease, stores counters and acknowledges", async () => {
    const { pool, statements } = fakePool({ deliveries: [message()] });
    const { observer, runs } = recordingObserver();
    let seen: Date | undefined;
    const summary = await processScheduledTasks(
      pool,
      [
        task(async (context) => {
          seen = context.windowEnd;
          await context.heartbeat();
          return { items: 2, ignored: -1, Bad: 3 };
        }),
      ],
      { owner: id, observer },
    );
    expect(summary).toMatchObject({ received: 1, succeeded: 1 });
    expect(seen?.toISOString()).toBe("2026-10-05T10:05:00.000Z");
    expect(sql(statements, "scheduler_renew_lease")).toHaveLength(1);
    expect(sql(statements, "scheduler_run_finish")[0]?.values?.[3]).toBe(
      JSON.stringify({ items: 2 }),
    );
    expect(sql(statements, "infra.ack_message")).toHaveLength(1);
    expect(runs.map((r) => r.outcome)).toEqual(["succeeded"]);
  });

  it("acknowledges a completed window without running it again", async () => {
    const { pool, statements } = fakePool({ deliveries: [message()], start: "DONE" });
    let calls = 0;
    const summary = await processScheduledTasks(pool, [task(async () => ({ items: ++calls }))], {
      owner: id,
    });
    expect(summary).toMatchObject({ duplicates: 1, succeeded: 0 });
    expect(calls).toBe(0);
    expect(sql(statements, "infra.ack_message")).toHaveLength(1);
  });

  it("leaves the message when another worker holds the lease", async () => {
    const { pool, statements } = fakePool({ deliveries: [message()], start: "BUSY" });
    let calls = 0;
    const summary = await processScheduledTasks(pool, [task(async () => ({ items: ++calls }))], {
      owner: id,
    });
    expect(summary).toMatchObject({ busy: 1 });
    expect(calls).toBe(0);
    expect(sql(statements, "infra.ack_message")).toHaveLength(0);
    expect(sql(statements, "infra.fail_job")).toHaveLength(0);
  });

  it("retries a failed handler with its code, or dead-letters it when attempts are exhausted", async () => {
    for (const [outcome, key] of [
      ["retry_scheduled", "retried"],
      ["dead_lettered", "deadLettered"],
    ] as const) {
      const { pool, statements } = fakePool({ deliveries: [message()], failOutcome: outcome });
      const { observer, runs } = recordingObserver();
      const summary = await processScheduledTasks(
        pool,
        [
          task(async () => {
            throw new ScheduledTaskFailure("STRIPE_UNAVAILABLE");
          }),
        ],
        { owner: id, observer },
      );
      expect(summary).toMatchObject({ [key]: 1 });
      expect(sql(statements, "infra.fail_job")[0]?.values?.[4]).toBe("STRIPE_UNAVAILABLE");
      expect(sql(statements, "scheduler_run_fail")[0]?.values?.slice(3)).toEqual([
        outcome,
        "STRIPE_UNAVAILABLE",
      ]);
      expect(sql(statements, "infra.ack_message")).toHaveLength(0);
      expect(runs[0]).toMatchObject({ errorCode: "STRIPE_UNAVAILABLE" });
    }
  });

  it("records nothing when the lease was lost to another worker", async () => {
    const { pool, statements } = fakePool({ deliveries: [message()], finish: "LEASE_LOST" });
    const summary = await processScheduledTasks(pool, [task()], { owner: id });
    expect(summary).toMatchObject({ leaseLost: 1, succeeded: 0 });
    expect(sql(statements, "infra.ack_message")).toHaveLength(0);
    expect(sql(statements, "infra.fail_job")).toHaveLength(0);
  });

  it("dead-letters invalid messages and tasks unknown to this worker", async () => {
    const { pool, statements } = fakePool({ deliveries: [{ nope: true }, message("other.task")] });
    const summary = await processScheduledTasks(pool, [task()], { owner: id });
    expect(summary).toMatchObject({ received: 2, deadLettered: 2 });
    expect(sql(statements, "infra.job_record_poison").map((s) => s.values?.[2])).toEqual([
      "INVALID_MESSAGE",
      "SCHEDULED_TASK_UNKNOWN",
    ]);
  });

  it("never turns error messages into failure codes", () => {
    expect(taskFailureCode(new Error("connection to 10.0.0.1 refused"))).toBe("HANDLER_FAILED");
    expect(taskFailureCode(new ScheduledTaskFailure("lower case"))).toBe("HANDLER_FAILED");
    expect(taskFailureCode(new ScheduledTaskFailure("STRIPE_UNAVAILABLE"))).toBe(
      "STRIPE_UNAVAILABLE",
    );
  });
});
