import { beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ session: vi.fn(), api: vi.fn() }));
vi.mock("../../../../server/session/session", async (original) => ({
  ...(await original<object>()),
  readBrowserSession: fixtures.session,
}));
vi.mock("../../../../server/session/supabase-auth", () => ({ callPrivateApi: fixtures.api }));
vi.mock("../../../../features/maintenance/tickets-authorization", () => ({
  authorizeTicketBff: async () => null,
}));
import { GET, POST } from "./route";
const id = "c0000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ path: [] }) };
function request(overrides: { csrf?: string; context?: string; data?: unknown } = {}) {
  const form = new FormData();
  form.set("csrfToken", overrides.csrf ?? "csrf");
  form.set("key", "ticket-key-123");
  form.set(
    "data",
    JSON.stringify(
      overrides.data ?? {
        machineId: id,
        systemId: id,
        priority: "normal",
        description: "Falla de producción desde ayer",
      },
    ),
  );
  return new Request("http://localhost/api/tickets", {
    method: "POST",
    body: form,
    headers: {
      origin: "http://localhost",
      "x-ice24-workspace-context": overrides.context ?? "context-a",
    },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.session.mockResolvedValue({
    contextId: "context-a",
    csrfToken: "csrf",
    accessToken: "private",
  });
  fixtures.api.mockResolvedValue(Response.json({ id }, { status: 201 }));
});
describe("tickets BFF security", () => {
  it("forwards additive filters and preserves an upstream error folio", async () => {
    fixtures.api.mockResolvedValue(
      Response.json(
        {
          error: {
            code: "DEPENDENCY_UNAVAILABLE",
            message: "Internal",
            correlationId: id,
            timestamp: "2026-11-23T12:00:00Z",
          },
        },
        { status: 503 },
      ),
    );
    const response = await GET(
      new Request(
        `http://localhost/api/tickets?machineId=${id}&priority=high&limit=2&metric=open&sort=recent&cursor=${encodeURIComponent(`2026-11-23T12:00:00.000501Z|${id}`)}`,
        { headers: { "x-ice24-workspace-context": "context-a" } },
      ),
      context,
    );
    expect(fixtures.api.mock.calls[0]![0]).toContain("priority=high");
    const forwarded = new URL(String(fixtures.api.mock.calls[0]![0]), "http://api.invalid");
    expect(forwarded.searchParams.get("sort")).toBe("recent");
    expect(forwarded.searchParams.get("cursor")).toBe(`2026-11-23T12:00:00.000501Z|${id}`);
    expect((await response.json()).correlationId).toBe(id);
  });
  it("rejects bad ranges and stale context for the new reads", async () => {
    const response = await GET(
      new Request("http://localhost/api/tickets?from=2026-11-24&to=2026-11-23", {
        headers: { "x-ice24-workspace-context": "context-a" },
      }),
      context,
    );
    expect(response.status).toBe(400);
    expect(
      (
        await GET(
          new Request("http://localhost/api/tickets", {
            headers: { "x-ice24-workspace-context": "old" },
          }),
          context,
        )
      ).status,
    ).toBe(409);
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("rejects stale context without calling the API", async () => {
    expect((await POST(request({ context: "other" }), context)).status).toBe(409);
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("rejects invalid CSRF without calling the API", async () => {
    expect((await POST(request({ csrf: "wrong" }), context)).status).toBe(403);
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("validates Spanish report boundaries", async () => {
    expect(
      (await POST(request({ data: { machineId: id, description: "x" } }), context)).status,
    ).toBe(400);
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("forwards idempotency without exposing server credentials", async () => {
    expect((await POST(request(), context)).status).toBe(201);
    expect(fixtures.api.mock.calls[0]?.[2].headers["idempotency-key"]).toBe("ticket-key-123");
  });
  it("requires expected version for diagnosis", async () => {
    const form = new FormData();
    form.set("csrfToken", "csrf");
    form.set("key", "ticket-key-123");
    form.set(
      "data",
      JSON.stringify({ diagnosis: "Diagnóstico de prueba válido", reason: "Revisión inicial" }),
    );
    const r = new Request("http://localhost/api/tickets", {
      method: "POST",
      body: form,
      headers: { origin: "http://localhost", "x-ice24-workspace-context": "context-a" },
    });
    expect((await POST(r, { params: Promise.resolve({ path: [id, "diagnosis"] }) })).status).toBe(
      400,
    );
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("requires a session for reads", async () => {
    fixtures.session.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost/api/tickets/options/x"), context)).status).toBe(
      401,
    );
  });
});
