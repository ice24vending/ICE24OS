import { describe, expect, it } from "vitest";
import {
  asyncJobSchema,
  jobQuerySchema,
  jobRetryRequestSchema,
  queueOverviewSchema,
  toPublicJobStatus,
} from "./jobs.js";

const id = "11111111-1111-4111-8111-111111111111";
const job = {
  id,
  type: "DOMAIN_EVENT",
  status: "DEAD_LETTER",
  queue: "domain_events",
  accountId: null,
  sourceType: "DomainEvent",
  sourceId: id,
  eventType: "SyntheticRecorded",
  attemptCount: 5,
  maxAttempts: 5,
  manualRetryCount: 0,
  nextAttemptAt: null,
  startedAt: "2026-10-02T12:00:00.000Z",
  finishedAt: "2026-10-02T12:05:00.000Z",
  errorCode: "PROVIDER_TIMEOUT",
  errorDetail: "El procesamiento agotó sus reintentos y requiere revisión de soporte.",
  correlationId: id,
  rowVersion: 7,
  createdAt: "2026-10-02T12:00:00.000Z",
  updatedAt: "2026-10-02T12:05:00.000Z",
};

describe("jobs v1 contract", () => {
  it("accepts registry jobs and rejects unknown states", () => {
    expect(asyncJobSchema.parse(job).status).toBe("DEAD_LETTER");
    expect(asyncJobSchema.safeParse({ ...job, status: "PAUSED" }).success).toBe(false);
  });
  it("validates filters strictly and only narrows", () => {
    expect(jobQuerySchema.parse({ status: "DEAD_LETTER", limit: "10" }).limit).toBe(10);
    for (const query of [
      { queue: "../pgmq" },
      { type: "domain event" },
      { limit: "101" },
      { raw: "1" },
      { from: "2026-10-03T00:00:00Z", to: "2026-10-02T00:00:00Z" },
    ])
      expect(jobQuerySchema.safeParse(query).success).toBe(false);
  });
  it("requires a meaningful reason to retry", () => {
    expect(jobRetryRequestSchema.safeParse({ reason: "  short  " }).success).toBe(false);
    expect(jobRetryRequestSchema.parse({ reason: "Provider recovered after INC-42" }).reason).toBe(
      "Provider recovered after INC-42",
    );
    expect(
      jobRetryRequestSchema.safeParse({ reason: "Provider recovered", force: true }).success,
    ).toBe(false);
  });
  it("maps registry states to the public Job resource", () => {
    expect(toPublicJobStatus("RETRY_WAIT")).toBe("processing");
    expect(toPublicJobStatus("DEAD_LETTER")).toBe("failed");
    expect(toPublicJobStatus("SUCCEEDED")).toBe("completed");
  });
  it("requires every state in the overview counts", () => {
    const base = {
      queues: [],
      outbox: { pending: 0, failing: 0, oldestPendingSeconds: null },
    };
    expect(queueOverviewSchema.safeParse({ ...base, jobs: { QUEUED: 1 } }).success).toBe(false);
    expect(
      queueOverviewSchema.safeParse({
        ...base,
        jobs: { QUEUED: 1, RUNNING: 0, SUCCEEDED: 2, RETRY_WAIT: 0, FAILED: 0, DEAD_LETTER: 1 },
      }).success,
    ).toBe(true);
  });
});
