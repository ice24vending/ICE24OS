import type { Meter } from "@opentelemetry/api";
import { describe, expect, it } from "vitest";
import type { LogRecordInput } from "./logging.js";
import { createScheduleObserver } from "./schedule-generation.js";

const recordingMeter = () => {
  const recorded: { name: string; value: number; attributes: unknown }[] = [];
  const instrument = (name: string) => ({
    add: (value: number, attributes: unknown) => recorded.push({ name, value, attributes }),
    record: (value: number, attributes: unknown) => recorded.push({ name, value, attributes }),
  });
  const meter = { createCounter: instrument, createHistogram: instrument } as unknown as Meter;
  return { meter, recorded };
};

describe("schedule job observability (F4-21)", () => {
  it("counts jobs, activity changes and failures with correlation in the log", () => {
    const { meter, recorded } = recordingMeter();
    const logs: LogRecordInput[] = [];
    const observer = createScheduleObserver({
      service: "worker",
      environment: "test",
      meter,
      log: (record) => logs.push(record),
    });
    const base = {
      jobId: "0192e8e8-45ad-7b12-8d90-73db122e70e1",
      machineId: "0192e8e8-45ad-7b12-8d90-73db122e70e2",
      attempt: 1,
    };
    observer.jobFinished({
      ...base,
      kind: "recalc",
      outcome: "generated",
      durationMs: 9,
      inserted: 2,
      cancelled: 1,
      correlationId: "0a7d1c4e-5f9b-4e2a-8c3d-1b2a3c4d5e6f",
    });
    observer.jobFinished({
      ...base,
      kind: "recalc",
      outcome: "dead_lettered",
      durationMs: 30,
      attempt: 5,
      errorCode: "SCHEDULE_GENERATION_FAILED",
    });
    expect(recorded).toEqual(
      expect.arrayContaining([
        {
          name: "ice24.schedule.jobs",
          value: 1,
          attributes: { kind: "recalc", outcome: "generated" },
        },
        {
          name: "ice24.schedule.activities",
          value: 2,
          attributes: { kind: "recalc", change: "inserted" },
        },
        {
          name: "ice24.schedule.activities",
          value: 1,
          attributes: { kind: "recalc", change: "cancelled" },
        },
        {
          name: "ice24.schedule.failures",
          value: 1,
          attributes: { kind: "recalc", error_code: "SCHEDULE_GENERATION_FAILED" },
        },
      ]),
    );
    expect(logs[0]).toMatchObject({
      level: "info",
      module: "schedule",
      outcome: "success",
      correlationId: "0a7d1c4e-5f9b-4e2a-8c3d-1b2a3c4d5e6f",
      attributes: { event: "schedule_job_finished", inserted: 2, cancelled: 1 },
    });
    expect(logs[1]).toMatchObject({
      level: "error",
      outcome: "failure",
      errorCode: "SCHEDULE_GENERATION_FAILED",
    });
  });
});
