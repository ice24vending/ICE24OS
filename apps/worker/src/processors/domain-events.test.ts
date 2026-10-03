import type { Pool } from "pg";
import { describe, expect, it } from "vitest";
import {
  ConsumerFailure,
  failureCode,
  processDomainEvents,
  validateConsumers,
  type DomainEventConsumer,
} from "./domain-events.js";

const id = "11111111-1111-4111-8111-111111111111";
const message = (type = "MachineActivated") => ({
  messageVersion: 1,
  eventId: id,
  type,
  eventVersion: 1,
  aggregateType: "Machine",
  aggregateId: id,
  aggregateVersion: 1,
  accountId: id,
  actor: { type: "USER", userId: id },
  contextSessionId: null,
  correlationId: id,
  causationId: null,
  occurredAt: "2026-10-03T12:00:00.000000Z",
  sensitivity: "internal",
  payload: {},
});

/** Records every statement; claims succeed unless the consumer already appears in `claimed`. */
const fakePool = (
  deliveries: unknown[],
  options: { claimed?: string[]; failOutcome?: string } = {},
) => {
  type Statement = { text: string; values?: unknown[] | undefined };
  const statements: Statement[] = [];
  const query = async (text: string, values?: unknown[]) => {
    statements.push({ text, values });
    if (text.includes("infra.read_queue"))
      return {
        rows: deliveries.map((m, i) => ({ msg_id: String(i + 1), read_ct: 2, message: m })),
      };
    if (text.includes("infra.claim_message"))
      return { rows: [{ claimed: !(options.claimed ?? []).includes(String(values?.[0])) }] };
    if (text.includes("infra.fail_job"))
      return { rows: [{ outcome: options.failOutcome ?? "retry_scheduled" }] };
    return { rows: [] };
  };
  const pool = { query, connect: async () => ({ query, release: () => undefined }) };
  return { pool: pool as unknown as Pool, statements };
};
const consumer = (
  name: string,
  handle: DomainEventConsumer["handle"] = async () => undefined,
  eventTypes: DomainEventConsumer["eventTypes"] = "*",
): DomainEventConsumer => ({ name, eventTypes, handle });
const sql = <S extends { text: string }>(statements: S[], fragment: string) =>
  statements.filter((s) => s.text.includes(fragment));

describe("domain event consumer engine", () => {
  it("applies an effect once, inside the claim transaction, then acknowledges", async () => {
    const { pool, statements } = fakePool([message()]);
    let calls = 0;
    const summary = await processDomainEvents(pool, [
      consumer("audit-mirror", async () => void calls++),
    ]);
    expect(summary).toMatchObject({ received: 1, processed: 1, retried: 0 });
    expect(calls).toBe(1);
    const order = statements.map(
      (s) => s.text.split(" ")[0] + (s.text.includes("claim") ? ":claim" : ""),
    );
    expect(order.indexOf("begin")).toBeLessThan(order.indexOf("select:claim"));
    expect(order.indexOf("select:claim")).toBeLessThan(order.indexOf("commit"));
    expect(sql(statements, "infra.ack_message")).toHaveLength(1);
  });
  it("skips the effect when the consumer already processed the event", async () => {
    const { pool, statements } = fakePool([message()], { claimed: ["audit-mirror"] });
    let calls = 0;
    const summary = await processDomainEvents(pool, [
      consumer("audit-mirror", async () => void calls++),
    ]);
    expect(calls).toBe(0);
    expect(summary).toMatchObject({ processed: 0, skipped: 1 });
    expect(sql(statements, "infra.ack_message")).toHaveLength(1);
  });
  it("rolls back, keeps the message and reports the attempt and code on failure", async () => {
    const { pool, statements } = fakePool([message()]);
    const summary = await processDomainEvents(pool, [
      consumer("mailer", async () => {
        throw new ConsumerFailure("PROVIDER_TIMEOUT");
      }),
    ]);
    expect(summary).toMatchObject({ retried: 1, processed: 0 });
    expect(sql(statements, "rollback")).toHaveLength(1);
    expect(sql(statements, "infra.ack_message")).toHaveLength(0);
    expect(sql(statements, "infra.fail_job")[0]!.values).toEqual([
      "domain_events",
      "1",
      JSON.stringify(message()),
      2,
      "PROVIDER_TIMEOUT",
    ]);
  });
  it("counts exhausted retries as dead-lettered", async () => {
    const { pool } = fakePool([message()], { failOutcome: "dead_lettered" });
    const summary = await processDomainEvents(pool, [
      consumer("mailer", async () => {
        throw new Error("boom with customer@example.test");
      }),
    ]);
    expect(summary).toMatchObject({ deadLettered: 1, retried: 0 });
  });
  it("sends invalid messages straight to the DLQ without calling consumers", async () => {
    const { pool, statements } = fakePool([{ eventId: "not-a-uuid" }], {
      failOutcome: "dead_lettered",
    });
    let calls = 0;
    const summary = await processDomainEvents(pool, [
      consumer("audit-mirror", async () => void calls++),
    ]);
    expect(calls).toBe(0);
    expect(summary.deadLettered).toBe(1);
    const values = sql(statements, "infra.fail_job")[0]!.values!;
    expect(values[3]).toBeGreaterThanOrEqual(1000);
    expect(values[4]).toBe("INVALID_MESSAGE");
  });
  it("acknowledges events nobody subscribes to", async () => {
    const { pool, statements } = fakePool([message("LoginFailed")]);
    const summary = await processDomainEvents(pool, [
      consumer("machines", async () => undefined, ["MachineActivated"]),
    ]);
    expect(summary).toMatchObject({ unhandled: 1, processed: 0 });
    expect(sql(statements, "infra.claim_message")).toHaveLength(0);
    expect(sql(statements, "infra.ack_message")).toHaveLength(1);
  });
  it("never records error messages as failure codes", () => {
    expect(failureCode(new Error("password=hunter2"))).toBe("HANDLER_FAILED");
    expect(failureCode(new ConsumerFailure("lower case"))).toBe("HANDLER_FAILED");
    expect(failureCode(new ConsumerFailure("RATE_LIMITED"))).toBe("RATE_LIMITED");
  });
  it("rejects invalid or duplicate consumer names and unsafe timeouts", async () => {
    expect(() => validateConsumers([consumer("Mailer")])).toThrow();
    expect(() => validateConsumers([consumer("mailer"), consumer("mailer")])).toThrow(/Duplicate/);
    const { pool } = fakePool([]);
    await expect(
      processDomainEvents(pool, [], { statementTimeout: "1s'; drop table x; --" }),
    ).rejects.toThrow(RangeError);
  });
});
