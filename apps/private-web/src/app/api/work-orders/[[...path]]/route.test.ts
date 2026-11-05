import { beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ session: vi.fn(), api: vi.fn() }));
vi.mock("../../../../server/session/session", async (original) => ({
  ...(await original<object>()),
  readBrowserSession: fixtures.session,
}));
vi.mock("../../../../server/session/supabase-auth", () => ({ callPrivateApi: fixtures.api }));
vi.mock("../../../../features/work-orders/work-orders-authorization", () => ({
  authorizeWorkOrderBff: async () => null,
}));
import { POST } from "./route";
const id = "c0000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ path: [] }) };
function request(overrides: { csrf?: string; context?: string; data?: unknown } = {}) {
  const form = new FormData();
  form.set("csrfToken", overrides.csrf ?? "csrf");
  form.set("key", "ticket-key-123");
  form.set("version", "1");
  form.set(
    "data",
    JSON.stringify(
      overrides.data ?? {
        sourceType: "ticket",
        sourceId: id,
        assigneeId: id,
        activityCode: "MNT-1",
        reason: "Asignación inicial",
      },
    ),
  );
  return new Request("http://localhost/api/work-orders", {
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
    form.set("data", JSON.stringify({ action: "start" }));
    const r = new Request("http://localhost/api/work-orders", {
      method: "POST",
      body: form,
      headers: { origin: "http://localhost", "x-ice24-workspace-context": "context-a" },
    });
    expect((await POST(r, { params: Promise.resolve({ path: [id, "transitions"] }) })).status).toBe(
      400,
    );
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("requires a session", async () => {
    fixtures.session.mockResolvedValue(null);
    expect((await POST(request(), context)).status).toBe(401);
  });
});
