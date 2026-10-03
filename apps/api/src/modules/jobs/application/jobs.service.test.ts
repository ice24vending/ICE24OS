import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AuthorizationSubject } from "@ice24/authorization";
import { jobQuerySchema, type JobDetail } from "@ice24/contracts";
import { JobsService } from "./jobs.service.js";
import { JobNotFoundError, JobStateConflictError, type JobsPort } from "./jobs.port.js";
import { jobsWhere } from "../infrastructure/jobs.database.js";

const account = randomUUID();
const now = "2026-10-02T12:00:00.000Z";
const job = (status: JobDetail["status"] = "DEAD_LETTER"): JobDetail => ({
  id: randomUUID(),
  type: "DOMAIN_EVENT",
  status,
  queue: "domain_events",
  accountId: account,
  sourceType: "DomainEvent",
  sourceId: randomUUID(),
  eventType: "SyntheticRecorded",
  attemptCount: 5,
  maxAttempts: 5,
  manualRetryCount: 0,
  nextAttemptAt: null,
  startedAt: now,
  finishedAt: now,
  errorCode: "PROVIDER_TIMEOUT",
  errorDetail: "El procesamiento agotó sus reintentos y requiere revisión de soporte.",
  correlationId: randomUUID(),
  rowVersion: 4,
  createdAt: now,
  updatedAt: now,
  transitions: [],
});
function subject(codes: string[], patch: Partial<AuthorizationSubject> = {}): AuthorizationSubject {
  return {
    userId: randomUUID(),
    membershipId: randomUUID(),
    membershipAccountId: account,
    membershipStatus: "ACTIVE",
    contextActive: true,
    accountAccessMode: "ACTIVE",
    assuranceLevel: "aal2",
    permissions: codes.map((code) => ({ code, effect: "ALLOW", classification: "RESTRICTED" })),
    accountWide: true,
    branchIds: new Set(),
    machineIds: new Set(),
    ...patch,
  };
}
function setup(codes: string[], patch: Partial<AuthorizationSubject> = {}) {
  const port = {
    list: vi.fn().mockResolvedValue({ items: [], page: { hasMore: false, nextCursor: null } }),
    detail: vi.fn().mockResolvedValue(job()),
    overview: vi.fn(),
    retry: vi.fn().mockResolvedValue(job("QUEUED")),
  };
  const context = randomUUID();
  return {
    port,
    context,
    service: new JobsService(port as unknown as JobsPort),
    request: {
      headers: { "x-ice24-context-id": context },
      correlationId: randomUUID(),
      localUser: { id: randomUUID() },
      authorizationSubject: subject(codes, patch),
    } as never,
  };
}

describe("job center authorization", () => {
  it("uses the global scope only with admin permission, MFA and account-wide scope", async () => {
    const { service, port, request } = setup(["jobs.admin-read"]);
    await service.list(request, { status: "DEAD_LETTER" });
    expect(port.list.mock.calls[0]?.[0]).toEqual({ accountId: null });
    for (const [codes, patch] of [
      [["jobs.read"], {}],
      [["jobs.admin-read"], { assuranceLevel: "aal1" }],
      [["jobs.admin-read"], { accountWide: false }],
      [["jobs.admin-read"], { contextActive: false }],
    ] as const) {
      const denied = setup([...codes], patch);
      expect(() => denied.service.list(denied.request, {})).toThrow();
    }
  });
  it("limits JOB-001 to the active account and exposes only public states", async () => {
    const { service, port, request } = setup(["jobs.read"]);
    const result = await service.publicJob(request, randomUUID());
    expect(port.detail.mock.calls[0]?.[0]).toEqual({ accountId: account });
    expect(result).toMatchObject({ status: "failed", error: { code: "PROVIDER_TIMEOUT" } });
    expect(JSON.stringify(result)).not.toContain("transitions");
    port.detail.mockResolvedValueOnce(null);
    await expect(service.publicJob(request, randomUUID())).rejects.toThrow("Job not found");
  });
});

describe("audited retry (INT-004)", () => {
  it("passes actor, context, reason, key and correlation to the port", async () => {
    const { service, port, request, context } = setup(["jobs.retry"]);
    const id = randomUUID();
    await service.retry(request, id, "retry-key-0001", {
      reason: "Provider recovered after INC-42",
    });
    expect(port.retry.mock.calls[0]?.[0]).toMatchObject({
      jobId: id,
      contextSessionId: context,
      reason: "Provider recovered after INC-42",
      idempotencyKey: "retry-key-0001",
    });
  });
  it("rejects missing keys, short reasons, extra fields and missing permission or MFA", async () => {
    const { service, port, request } = setup(["jobs.retry"]);
    const id = randomUUID();
    await expect(
      service.retry(request, id, undefined, { reason: "Provider recovered" }),
    ).rejects.toThrow("Idempotency-Key");
    await expect(
      service.retry(request, id, "bad key!", { reason: "Provider recovered" }),
    ).rejects.toThrow();
    await expect(
      service.retry(request, id, "retry-key-0001", { reason: "short" }),
    ).rejects.toThrow();
    await expect(
      service.retry(request, id, "retry-key-0001", { reason: "Provider recovered", force: true }),
    ).rejects.toThrow();
    expect(port.retry).not.toHaveBeenCalled();
    for (const [codes, patch] of [
      [["jobs.admin-read"], {}],
      [["jobs.retry"], { assuranceLevel: "aal1" }],
      [["jobs.retry"], { accountAccessMode: "SUSPENDED" }],
    ] as const) {
      const denied = setup([...codes], patch);
      await expect(
        denied.service.retry(denied.request, id, "retry-key-0001", {
          reason: "Provider recovered",
        }),
      ).rejects.toThrow();
    }
  });
  it("maps registry conflicts to 404 and 409", async () => {
    const { service, port, request } = setup(["jobs.retry"]);
    port.retry.mockRejectedValueOnce(new JobNotFoundError());
    await expect(
      service.retry(request, randomUUID(), "retry-key-0001", { reason: "Provider recovered" }),
    ).rejects.toMatchObject({ status: 404 });
    port.retry.mockRejectedValueOnce(new JobStateConflictError());
    await expect(
      service.retry(request, randomUUID(), "retry-key-0001", { reason: "Provider recovered" }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("ignores context headers that are not identifiers", async () => {
    const { service, port, request } = setup(["jobs.retry"]);
    (request as { headers: Record<string, string> }).headers["x-ice24-context-id"] = "x' or 1=1";
    await service.retry(request, randomUUID(), "retry-key-0001", { reason: "Provider recovered" });
    expect(port.retry.mock.calls[0]?.[0].contextSessionId).toBeNull();
  });
});

describe("job query builder", () => {
  it("binds every filter and never interpolates values", () => {
    const { values, where } = jobsWhere(
      { accountId: account },
      jobQuerySchema.parse({ status: "DEAD_LETTER", queue: "domain_events", type: "DOMAIN_EVENT" }),
    );
    expect(where).not.toContain("DEAD_LETTER");
    expect(values).toEqual([account, "DEAD_LETTER", "DOMAIN_EVENT", "domain_events"]);
    expect(() =>
      jobsWhere({ accountId: null }, jobQuerySchema.parse({ cursor: "not-base64-json" })),
    ).toThrow("Invalid job cursor");
  });
});
