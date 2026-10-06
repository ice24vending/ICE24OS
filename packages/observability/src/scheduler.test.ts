import type { Meter } from "@opentelemetry/api";
import { describe, expect, it } from "vitest";
import type { LogRecordInput } from "./logging.js";
import { createSchedulerObserver } from "./scheduler.js";

const recordingMeter = () => {
  const recorded: { name: string; value: number; attributes: unknown }[] = [];
  const instrument = (name: string) => ({
    add: (value: number, attributes: unknown) => recorded.push({ name, value, attributes }),
    record: (value: number, attributes: unknown) => recorded.push({ name, value, attributes }),
  });
  const meter = {
    createCounter: instrument,
    createHistogram: instrument,
  } as unknown as Meter;
  return { meter, recorded };
};

describe("scheduler observability (F5-13)", () => {
  it("counts runs, latency and failures with task and code attributes only", () => {
    const { meter, recorded } = recordingMeter();
    const logs: LogRecordInput[] = [];
    const observer = createSchedulerObserver({
      service: "worker",
      environment: "test",
      meter,
      log: (record) => logs.push(record),
    });
    observer.runFinished({
      task: "subscriptions.expirations",
      outcome: "succeeded",
      durationMs: 12,
    });
    observer.runFinished({
      task: "subscriptions.expirations",
      outcome: "dead_lettered",
      durationMs: 40,
      errorCode: "HANDLER_FAILED",
      correlationId: "0a7d1c4e-5f9b-4e2a-8c3d-1b2a3c4d5e6f",
    });
    expect(recorded).toEqual([
      {
        name: "ice24.scheduler.runs",
        value: 1,
        attributes: { task: "subscriptions.expirations", outcome: "succeeded" },
      },
      {
        name: "ice24.scheduler.run.duration",
        value: 12,
        attributes: { task: "subscriptions.expirations", outcome: "succeeded" },
      },
      {
        name: "ice24.scheduler.runs",
        value: 1,
        attributes: { task: "subscriptions.expirations", outcome: "dead_lettered" },
      },
      {
        name: "ice24.scheduler.run.duration",
        value: 40,
        attributes: { task: "subscriptions.expirations", outcome: "dead_lettered" },
      },
      {
        name: "ice24.scheduler.failures",
        value: 1,
        attributes: { task: "subscriptions.expirations", error_code: "HANDLER_FAILED" },
      },
    ]);
    expect(logs.map((log) => [log.level, log.outcome, log.errorCode])).toEqual([
      ["info", "success", undefined],
      ["error", "failure", "HANDLER_FAILED"],
    ]);
    expect(logs[1]?.correlationId).toBe("0a7d1c4e-5f9b-4e2a-8c3d-1b2a3c4d5e6f");
  });

  it("reports skipped windows as a warning and ignores empty counts", () => {
    const { meter, recorded } = recordingMeter();
    const logs: LogRecordInput[] = [];
    const observer = createSchedulerObserver({
      service: "worker",
      environment: "test",
      meter,
      log: (record) => logs.push(record),
    });
    observer.windowsSkipped("reports.weekly-period", 0);
    observer.windowsSkipped("reports.weekly-period", 3);
    expect(recorded).toEqual([
      {
        name: "ice24.scheduler.windows.skipped",
        value: 3,
        attributes: { task: "reports.weekly-period" },
      },
    ]);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      level: "warn",
      errorCode: "SCHEDULE_WINDOWS_SKIPPED",
      attributes: { event: "scheduled_windows_skipped", task: "reports.weekly-period", count: 3 },
    });
  });
});
