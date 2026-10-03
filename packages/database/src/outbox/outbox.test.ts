import { describe, expect, it } from "vitest";
import { appendOutboxEvent, publishOutbox, readOutboxStatus, type SqlClient } from "./index.js";

const id = "11111111-1111-4111-8111-111111111111";
const recorder = (rows: Record<string, unknown>[] = []) => {
  const calls: { text: string; values: readonly unknown[] | undefined }[] = [];
  const client: SqlClient = {
    query: async <Row>(text: string, values?: readonly unknown[]) => {
      calls.push({ text, values });
      return { rows: rows as Row[] };
    },
  };
  return { client, calls };
};
const event = {
  type: "MachineActivated",
  aggregateType: "Machine",
  aggregateId: id,
  accountId: id,
  actor: { type: "USER" as const, userId: id },
  sensitivity: "internal" as const,
  correlationId: id,
  occurredAt: "2026-10-03T12:00:00.000000Z",
  payload: { status: "ACTIVE" },
};

describe("transactional outbox helpers", () => {
  it("inserts a validated event with parameters only, on the caller's client", async () => {
    const { client, calls } = recorder([{ id }]);
    await expect(appendOutboxEvent(client, event)).resolves.toBe(id);
    expect(calls[0]!.text).toContain("insert into infra.outbox_events");
    expect(calls[0]!.text).toContain("on conflict (id) do nothing");
    expect(calls[0]!.text).not.toContain("ACTIVE");
    expect(calls[0]!.values).toContain(JSON.stringify({ status: "ACTIVE" }));
  });
  it("treats a retried producer with the same event id as idempotent", async () => {
    const { client, calls } = recorder([]);
    await expect(appendOutboxEvent(client, { ...event, id })).resolves.toBe(id);
    expect(calls[0]!.values?.[0]).toBe(id);
  });
  it("rejects invalid events before touching the database", async () => {
    const { client, calls } = recorder();
    await expect(
      appendOutboxEvent(client, { ...event, type: "machine.activated" }),
    ).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
  it("bounds publish batches and parses database summaries", async () => {
    const { client } = recorder([{ published: 3, failed: 1, pending: "4" }]);
    await expect(publishOutbox(client, 50)).resolves.toEqual({
      published: 3,
      failed: 1,
      pending: 4,
    });
    await expect(publishOutbox(client, 0)).rejects.toThrow(RangeError);
    await expect(publishOutbox(client, 501)).rejects.toThrow(RangeError);
  });
  it("reports an empty outbox without inventing ages", async () => {
    const { client } = recorder([
      { pending: "0", failing: "0", max_attempts: null, oldest_pending_seconds: null },
    ]);
    await expect(readOutboxStatus(client)).resolves.toEqual({
      pending: 0,
      failing: 0,
      maxAttempts: null,
      oldestPendingSeconds: null,
    });
  });
});
