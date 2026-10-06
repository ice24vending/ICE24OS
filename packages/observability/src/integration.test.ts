import type { Meter } from "@opentelemetry/api";
import { describe, expect, it } from "vitest";
import {
  correlationHeaders,
  createIntegrationTracer,
  createSqlIntegrationLogSink,
  currentIntegrationContext,
  redactIntegrationDetails,
  redactIntegrationValue,
  withIntegrationContext,
  type IntegrationLogEntry,
  type IntegrationLogSink,
} from "./integration.js";
import type { LogRecordInput } from "./logging.js";

const correlation = "0a7d1c4e-5f9b-4e2a-8c3d-1b2a3c4d5e6f";
const account = "22222222-2222-4222-8222-222222222222";
const job = "33333333-3333-4333-8333-333333333333";

const meter = () => {
  const recorded: { name: string; value: number; attributes: unknown }[] = [];
  const instrument = (name: string) => ({
    add: (value: number, attributes: unknown) => recorded.push({ name, value, attributes }),
    record: (value: number, attributes: unknown) => recorded.push({ name, value, attributes }),
  });
  return {
    recorded,
    meter: { createCounter: instrument, createHistogram: instrument } as unknown as Meter,
  };
};
const memorySink = () => {
  const entries: IntegrationLogEntry[] = [];
  const sink: IntegrationLogSink = { record: async (entry) => void entries.push(entry) };
  return { entries, sink };
};

describe("integration log redaction (F5-14)", () => {
  it("never keeps URLs, signed paths, tokens, secrets, card numbers or addresses", () => {
    expect(
      redactIntegrationValue(
        "GET https://proj.supabase.co/storage/v1/object/sign/originals/a?token=abc ok",
      ),
    ).toBe("GET [URL] ok");
    expect(redactIntegrationValue("/object/upload/sign/quarantine/a/b?token=xyz")).toBe("[URL]");
    expect(redactIntegrationValue("Bearer eyJhbGciOi.payload.sig")).toBe("[TOKEN]");
    expect(redactIntegrationValue("key sk_live_51abcDEF and whsec_123abc")).toBe(
      "key [SECRET] and [SECRET]",
    );
    expect(redactIntegrationValue("card 4242 4242 4242 4242 declined")).toBe(
      "card [CARD] declined",
    );
    expect(redactIntegrationValue("to owner@example.test")).toBe("to [EMAIL]");
    expect(redactIntegrationValue("x".repeat(500))).toHaveLength(200);
  });

  it("keeps flat scalars under safe keys and drops everything else", () => {
    expect(
      redactIntegrationDetails({
        bucket: "originals",
        sizeBytes: 1024,
        clean: true,
        missing: null,
        eventType: "checkout.session.completed",
        note: "see https://evil.test/?token=1",
        url: "https://x.test",
        signedUrl: "/object/sign/x?token=1",
        authorization: "Bearer abc",
        cardNumber: "4242424242424242",
        email: "owner@example.test",
        fileContent: "bytes",
        payload: "{}",
        nested: { a: 1 },
        list: [1],
        infinite: Number.POSITIVE_INFINITY,
        "bad key": "x",
      }),
    ).toEqual({
      bucket: "originals",
      sizeBytes: 1024,
      clean: true,
      missing: null,
      eventType: "checkout.session.completed",
      note: "see [URL]",
    });
  });
});

describe("integration tracer (F5-14)", () => {
  it("records a successful call with the enclosing correlation, account, attempt and job", async () => {
    const { entries, sink } = memorySink();
    const { meter: fake, recorded } = meter();
    const tracer = createIntegrationTracer({
      service: "worker",
      environment: "test",
      sink,
      meter: fake,
      now: () => new Date("2026-10-06T10:00:00Z"),
    });
    const result = await withIntegrationContext(
      { correlationId: correlation, accountId: account, attempt: 3, jobId: job },
      () =>
        tracer.trace(
          {
            integration: "email",
            operation: "message.send",
            provider: "local",
            effectKey: "message-1",
            details: { template: "alert.critical@1" },
            onSuccess: () => ({ responseCode: "accepted" }),
          },
          async () => {
            expect(correlationHeaders()).toEqual({ "x-correlation-id": correlation });
            return "ok";
          },
        ),
    );
    expect(result).toBe("ok");
    expect(entries).toEqual([
      expect.objectContaining({
        integration: "email",
        operation: "message.send",
        direction: "OUTBOUND",
        provider: "local",
        status: "SUCCEEDED",
        responseCode: "accepted",
        errorCode: null,
        attempt: 3,
        effectKey: "message-1",
        correlationId: correlation,
        accountId: account,
        jobId: job,
        details: { template: "alert.critical@1" },
        occurredAt: new Date("2026-10-06T10:00:00Z"),
      }),
    ]);
    expect(recorded.map((r) => r.name)).toEqual([
      "ice24.integration.calls",
      "ice24.integration.duration",
    ]);
    expect(currentIntegrationContext()).toEqual({});
  });

  it("records failures with a diagnostic code, never the message, and rethrows the original", async () => {
    const { entries, sink } = memorySink();
    const logs: LogRecordInput[] = [];
    const tracer = createIntegrationTracer({
      service: "api",
      environment: "test",
      sink,
      meter: meter().meter,
      log: (record) => logs.push(record),
    });
    const original = new Error("connect ECONNREFUSED 10.0.0.1 sk_live_secret");
    await expect(
      tracer.trace(
        {
          integration: "stripe",
          operation: "checkout.session.create",
          provider: "stripe",
          context: { correlationId: correlation },
          onError: () => ({
            errorCode: "DEPENDENCY_UNAVAILABLE",
            retryable: true,
            responseCode: 503,
          }),
        },
        async () => {
          throw original;
        },
      ),
    ).rejects.toBe(original);
    expect(entries[0]).toMatchObject({
      status: "FAILED",
      errorCode: "DEPENDENCY_UNAVAILABLE",
      retryable: true,
      responseCode: "503",
      attempt: 1,
    });
    expect(JSON.stringify(entries[0])).not.toContain("ECONNREFUSED");
    expect(logs[0]).toMatchObject({ level: "warn", errorCode: "DEPENDENCY_UNAVAILABLE" });
  });

  it("normalizes invalid codes and generates a correlation when none is in scope", async () => {
    const { entries, sink } = memorySink();
    const tracer = createIntegrationTracer({
      service: "api",
      environment: "test",
      sink,
      meter: meter().meter,
      log: () => undefined,
    });
    await tracer.record({
      integration: "queue",
      operation: "Bad Operation",
      provider: "PGMQ!",
      status: "FAILED",
      latencyMs: -5,
      errorCode: "not a code",
      responseCode: "has spaces",
    });
    expect(entries[0]).toMatchObject({
      operation: "unknown",
      provider: "unknown",
      latencyMs: 0,
      errorCode: "INTEGRATION_FAILED",
      responseCode: null,
    });
    expect(entries[0]?.correlationId).toMatch(/^[0-9a-f-]{36}$/u);
  });

  it("never breaks the integration call when the store fails", async () => {
    const logs: LogRecordInput[] = [];
    const { meter: fake, recorded } = meter();
    const tracer = createIntegrationTracer({
      service: "worker",
      environment: "test",
      sink: { record: () => Promise.reject(new Error("database down")) },
      meter: fake,
      log: (record) => logs.push(record),
    });
    await expect(
      tracer.trace(
        { integration: "antimalware", operation: "file.scan", provider: "clamav" },
        async () => 7,
      ),
    ).resolves.toBe(7);
    expect(recorded.map((r) => r.name)).toContain("ice24.integration.log_failures");
    expect(logs.at(-1)).toMatchObject({ errorCode: "INTEGRATION_LOG_UNAVAILABLE" });
  });

  it("writes through infra.record_integration_log with typed parameters", async () => {
    const calls: { text: string; values?: unknown[] | undefined }[] = [];
    const sink = createSqlIntegrationLogSink({
      query: async (text, values) => void calls.push({ text, values }),
    });
    await sink.record({
      integration: "object_storage",
      operation: "upload.sign",
      direction: "OUTBOUND",
      provider: "supabase-storage",
      status: "SUCCEEDED",
      latencyMs: 12,
      responseCode: "200",
      errorCode: null,
      retryable: null,
      attempt: 1,
      effectKey: "quarantine/key",
      correlationId: correlation,
      requestCorrelationId: null,
      accountId: account,
      jobId: null,
      details: { bucket: "quarantine" },
      occurredAt: new Date("2026-10-06T10:00:00Z"),
    });
    expect(calls[0]?.text).toContain("infra.record_integration_log");
    expect(calls[0]?.values).toHaveLength(17);
    expect(calls[0]?.values?.[15]).toBe('{"bucket":"quarantine"}');
  });
});
