import { describe, expect, it } from "vitest";
import {
  createIntegrationTracer,
  type IntegrationLogEntry,
  type IntegrationTracer,
} from "@ice24/observability";
import { observeDelivery } from "./delivery.js";
import { SimulatedScanner, EICAR_TEST_SIGNATURE } from "./files/scanner.js";
import { StorageFailure, type ScanStorage } from "./files/storage.js";
import {
  tracedEmailProvider,
  tracedObservationSource,
  tracedScanner,
  tracedScanStorage,
} from "./integrations.js";
import { LocalEmailProvider } from "./notifications/email/provider.js";
import { FakeSubscriptionObservationSource } from "./scheduler/reconciliation.js";

const correlation = "0a7d1c4e-5f9b-4e2a-8c3d-1b2a3c4d5e6f";
const account = "22222222-2222-4222-8222-222222222222";
const job = "33333333-3333-4333-8333-333333333333";

const tracer = (): { tracer: IntegrationTracer; entries: IntegrationLogEntry[] } => {
  const entries: IntegrationLogEntry[] = [];
  return {
    entries,
    tracer: createIntegrationTracer({
      service: "worker",
      environment: "test",
      sink: { record: async (entry) => void entries.push(entry) },
      log: () => undefined,
    }),
  };
};
const email = {
  idempotencyKey: "44444444-4444-4444-8444-444444444444",
  to: "owner@example.test",
  subject: "Asunto",
  text: "Texto",
  html: "<p>Texto</p>",
  tags: { template: "alert.critical@1", correlationId: correlation },
};
const meta = {
  queue: "email_deliveries",
  messageId: "17",
  attempt: 2,
  correlationId: correlation,
  accountId: account,
  jobId: job,
};

describe("worker integration logs (F5-14)", () => {
  it("runs a delivery in its correlation scope and records the queue attempt", async () => {
    const { tracer: traced, entries } = tracer();
    const provider = tracedEmailProvider(new LocalEmailProvider(), traced);
    const outcome = await observeDelivery(traced, meta, async () => {
      await provider.send(email);
      return { outcome: "succeeded" };
    });
    expect(outcome).toBe("succeeded");
    expect(entries.map((e) => [e.integration, e.operation, e.status, e.attempt])).toEqual([
      ["email", "message.send", "SUCCEEDED", 2],
      ["queue", "message.consume", "SUCCEEDED", 2],
    ]);
    for (const entry of entries)
      expect(entry).toMatchObject({ correlationId: correlation, accountId: account, jobId: job });
    expect(entries[0]).toMatchObject({ effectKey: email.idempotencyKey, responseCode: "accepted" });
    expect(entries[1]).toMatchObject({
      effectKey: "email_deliveries:17",
      details: { queue: "email_deliveries", outcome: "succeeded" },
    });
    // The address, subject and body never reach the log.
    expect(JSON.stringify(entries)).not.toMatch(/owner@example|Asunto|Texto/u);
  });

  it("records provider failures with their code and the delivery as retried", async () => {
    const { tracer: traced, entries } = tracer();
    const local = new LocalEmailProvider();
    local.failWith("PROVIDER_UNAVAILABLE");
    const provider = tracedEmailProvider(local, traced);
    await observeDelivery(traced, meta, async () => {
      await expect(provider.send(email)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
      return { outcome: "retried", errorCode: "PROVIDER_UNAVAILABLE" };
    });
    expect(entries.map((e) => [e.integration, e.status, e.errorCode, e.retryable])).toEqual([
      ["email", "FAILED", "PROVIDER_UNAVAILABLE", true],
      ["queue", "FAILED", "PROVIDER_UNAVAILABLE", true],
    ]);
    local.failWith("PROVIDER_REJECTED");
    await expect(provider.send(email)).rejects.toBeDefined();
    expect(entries.at(-1)).toMatchObject({ errorCode: "PROVIDER_REJECTED", retryable: false });
  });

  it("records storage operations by object without URLs or keys", async () => {
    const { tracer: traced, entries } = tracer();
    const storage: ScanStorage = {
      download: async () => new Uint8Array([1, 2, 3]),
      upload: async () => undefined,
      remove: async () => {
        throw new StorageFailure("STORAGE_UNAVAILABLE");
      },
    };
    const wrapped = tracedScanStorage(storage, traced);
    const key =
      "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/v1/33333333-3333-4333-8333-333333333333";
    await expect(wrapped.download("quarantine", key, 10)).resolves.toHaveLength(3);
    await expect(wrapped.remove("quarantine", key)).rejects.toBeInstanceOf(StorageFailure);
    expect(entries.map((e) => [e.operation, e.status, e.errorCode, e.effectKey])).toEqual([
      ["object.download", "SUCCEEDED", null, `quarantine/${key}`],
      ["object.remove", "FAILED", "STORAGE_UNAVAILABLE", `quarantine/${key}`],
    ]);
    expect(entries[0]?.details).toEqual({ bucket: "quarantine" });
  });

  it("records the antimalware verdict but not the bytes or signature", async () => {
    const { tracer: traced, entries } = tracer();
    const scanner = tracedScanner(new SimulatedScanner(), traced);
    const report = await scanner.scan(Buffer.from(EICAR_TEST_SIGNATURE, "latin1"));
    expect(report.verdict).toBe("INFECTED");
    expect(entries[0]).toMatchObject({
      integration: "antimalware",
      provider: "simulated",
      responseCode: "INFECTED",
      details: { sizeBytes: EICAR_TEST_SIGNATURE.length },
    });
    expect(JSON.stringify(entries)).not.toMatch(/EICAR|Eicar/u);
  });

  it("records Stripe observations of the reconciliation source", async () => {
    const { tracer: traced, entries } = tracer();
    const fake = new FakeSubscriptionObservationSource();
    const source = tracedObservationSource(fake, traced);
    const reference = {
      accountId: account,
      providerCustomerId: "cus_A",
      providerSubscriptionId: "sub_A",
    };
    await expect(source.observe(reference)).resolves.toBeNull();
    fake.failNext(1);
    await expect(source.observe(reference)).rejects.toBeDefined();
    expect(
      entries.map((e) => [e.provider, e.status, e.responseCode, e.errorCode, e.accountId]),
    ).toEqual([
      ["fake-stripe", "SUCCEEDED", "404", null, account],
      ["fake-stripe", "FAILED", null, "STRIPE_UNAVAILABLE", account],
    ]);
  });
});
