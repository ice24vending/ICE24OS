import { beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ session: vi.fn(), api: vi.fn(), csrf: vi.fn() }));
vi.mock("../../../server/session/session", () => ({
  readBrowserSession: fixtures.session,
  requireValidCsrf: fixtures.csrf,
}));
vi.mock("../../../server/session/supabase-auth", () => ({ callPrivateApi: fixtures.api }));
import { GET } from "./route";
import { GET as DETAIL } from "./[jobId]/route";
import { POST as RETRY } from "./[jobId]/retry/route";

const id = "11111111-1111-4111-8111-111111111111";
const job = {
  id,
  type: "DOMAIN_EVENT",
  status: "QUEUED",
  queue: "domain_events",
  accountId: null,
  sourceType: "DomainEvent",
  sourceId: id,
  eventType: "SyntheticRecorded",
  attemptCount: 0,
  maxAttempts: 5,
  manualRetryCount: 1,
  nextAttemptAt: null,
  startedAt: null,
  finishedAt: null,
  errorCode: null,
  errorDetail: null,
  correlationId: null,
  rowVersion: 3,
  createdAt: "2026-10-02T12:00:00.000Z",
  updatedAt: "2026-10-02T12:00:00.000Z",
};
const get = (query = "", context = "current") =>
  new Request(`https://private.test/api/jobs?${query}`, {
    headers: { "x-ice24-workspace-context": context },
  });
const retry = (fields: Record<string, string>, context = "current") => {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return new Request(`https://private.test/api/jobs/${id}/retry`, {
    method: "POST",
    body,
    headers: { "x-ice24-workspace-context": context, origin: "https://private.test" },
  });
};
const params = (jobId = id) => ({ params: Promise.resolve({ jobId }) });
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.session.mockResolvedValue({
    contextId: "current",
    accessToken: "secret",
    csrfToken: "t",
  });
  fixtures.api.mockResolvedValue(
    Response.json({ items: [], page: { hasMore: false, nextCursor: null } }),
  );
});

describe("job center BFF", () => {
  it("rejects stale contexts and expired sessions before forwarding", async () => {
    expect((await GET(get("", "old"))).status).toBe(409);
    expect(
      (await RETRY(retry({ reason: "Provider recovered", key: "retry-key-0001" }, "old"), params()))
        .status,
    ).toBe(409);
    fixtures.session.mockResolvedValue(null);
    expect((await GET(get())).status).toBe(401);
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("forwards only validated filters to the admin endpoints", async () => {
    for (const query of [
      "view=raw",
      "queue=../pgmq",
      "limit=500",
      "status=PAUSED",
      "view=overview&x=1",
    ])
      expect((await GET(get(query))).status).toBe(400);
    expect(fixtures.api).not.toHaveBeenCalled();
    const response = await GET(get("status=DEAD_LETTER&queue=domain_events"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fixtures.api.mock.calls[0]?.[0]).toBe(
      "admin/jobs?limit=25&status=DEAD_LETTER&queue=domain_events",
    );
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
  it("validates job identifiers and upstream shapes", async () => {
    expect((await DETAIL(get(), params("../admin"))).status).toBe(400);
    fixtures.api.mockResolvedValueOnce(Response.json({ raw: "internal" }));
    expect((await DETAIL(get(), params())).status).toBe(503);
    fixtures.api.mockResolvedValueOnce(Response.json({}, { status: 403 }));
    expect((await DETAIL(get(), params())).status).toBe(403);
  });
  it("requires CSRF, an idempotency key and a meaningful reason to retry", async () => {
    fixtures.csrf.mockImplementationOnce(() => {
      throw new Error("bad");
    });
    expect(
      (await RETRY(retry({ reason: "Provider recovered", key: "retry-key-0001" }), params()))
        .status,
    ).toBe(403);
    expect((await RETRY(retry({ reason: "Provider recovered", key: "x" }), params())).status).toBe(
      400,
    );
    expect((await RETRY(retry({ reason: "short", key: "retry-key-0001" }), params())).status).toBe(
      400,
    );
    // F5-15: the expected rowVersion is mandatory.
    for (const version of [undefined, "0", "W/3", "-1"])
      expect(
        (
          await RETRY(
            retry({
              reason: "Provider recovered",
              key: "retry-key-0001",
              ...(version === undefined ? {} : { version }),
            }),
            params(),
          )
        ).status,
      ).toBe(400);
    expect(fixtures.api).not.toHaveBeenCalled();
    fixtures.api.mockResolvedValueOnce(Response.json(job, { status: 202 }));
    const accepted = await RETRY(
      retry({ reason: "Provider recovered", key: "retry-key-0001", version: "3" }),
      params(),
    );
    expect(accepted.status).toBe(202);
    expect(fixtures.api.mock.calls[0]?.[0]).toBe(`admin/jobs/${id}/retry`);
    expect(fixtures.api.mock.calls[0]?.[2]).toMatchObject({
      method: "POST",
      headers: { "idempotency-key": "retry-key-0001", "if-match": 'W/"3"' },
      body: JSON.stringify({ reason: "Provider recovered" }),
    });
  });
  it("preserves conflict and permission errors from the API", async () => {
    fixtures.api.mockResolvedValueOnce(Response.json({}, { status: 409 }));
    const conflict = await RETRY(
      retry({ reason: "Provider recovered", key: "retry-key-0001", version: "3" }),
      params(),
    );
    expect(conflict.status).toBe(409);
    expect(((await conflict.json()) as { message: string }).message).toContain(
      "Actualiza la vista",
    );
    fixtures.api.mockResolvedValueOnce(
      Response.json(
        {
          error: {
            code: "PRECONDITION_FAILED",
            message: "upstream detail",
            correlationId: id,
            timestamp: "2026-10-06T12:00:00.000Z",
          },
        },
        { status: 412 },
      ),
    );
    const stale = await RETRY(
      retry({ reason: "Provider recovered", key: "retry-key-0002", version: "2" }),
      params(),
    );
    expect(stale.status).toBe(412);
    const body = (await stale.json()) as { message: string; code: string };
    expect(body.code).toBe("PRECONDITION_FAILED");
    expect(body.message).toContain("El trabajo cambió");
    expect(body.message).not.toContain("upstream");
  });
});
