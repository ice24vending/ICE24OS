import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn(), api: vi.fn(), clear: vi.fn() }));
vi.mock("../../../server/session/session", async (original) => ({
  ...(await original<object>()),
  readBrowserSession: mocks.read,
  clearBrowserSession: mocks.clear,
}));
vi.mock("../../../server/session/supabase-auth", () => ({ callPrivateApi: mocks.api }));
import { PATCH } from "./route";
import { POST } from "./sessions/revoke-all/route";
import { DELETE } from "./sessions/[sessionId]/route";
const contextId = "f0000000-0000-4000-8000-000000000001";
const otherId = "f0000000-0000-4000-8000-000000000002";
function request(
  method: string,
  changes: Record<string, string> = {},
  origin = "http://localhost:3000",
  context = contextId,
) {
  const body = new FormData();
  for (const [key, value] of Object.entries({
    csrfToken: "csrf-client-one",
    key: "request-key-123",
    version: "7",
    displayName: "Laura Méndez",
    phone: "+52 81 5550 2418",
    jobTitle: "Directora",
    locale: "es-MX",
    timeZone: "America/Mexico_City",
    ...changes,
  }))
    body.set(key, value);
  return new Request("http://localhost:3000/api/profile", {
    method,
    body,
    headers: { origin, "x-ice24-workspace-context": context },
  });
}
describe("profile BFF mutation boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.read.mockResolvedValue({
      accessToken: "synthetic",
      csrfToken: "csrf-client-one",
      contextId,
    });
  });
  it("requires session, same context and CSRF before calling the API", async () => {
    for (const req of [
      request("PATCH", { csrfToken: "wrong" }),
      request("PATCH", {}, "https://foreign.test"),
      request("PATCH", {}, "http://localhost:3000", otherId),
    ])
      expect((await PATCH(req)).status).toBeGreaterThanOrEqual(400);
    mocks.read.mockResolvedValue(undefined);
    expect((await PATCH(request("PATCH"))).status).toBe(401);
    expect(mocks.api).not.toHaveBeenCalled();
  });
  it("forwards only editable fields and If-Match to the existing PATCH me", async () => {
    mocks.api.mockResolvedValue(
      Response.json({
        id: "e0000000-0000-4000-8000-000000000001",
        identitySubject: "own",
        username: "laura",
        email: "laura@example.test",
        displayName: "Laura Méndez",
        locale: "es-MX",
        timeZone: "America/Mexico_City",
        status: "ACTIVE",
        version: 8,
      }),
    );
    expect(
      (await PATCH(request("PATCH", { email: "attacker@example.test", userId: otherId }))).status,
    ).toBe(200);
    expect(mocks.api.mock.calls[0]?.[0]).toBe("me");
    const init = mocks.api.mock.calls[0]?.[2] as RequestInit;
    expect(init.method).toBe("PATCH");
    expect(new Headers(init.headers).get("if-match")).toBe('W/"7"');
    expect(JSON.parse(String(init.body))).not.toHaveProperty("email");
    expect(JSON.parse(String(init.body))).not.toHaveProperty("userId");
  });
  it("rejects missing profile versions and invalid fields", async () => {
    expect((await PATCH(request("PATCH", { version: "" }))).status).toBe(400);
    expect((await PATCH(request("PATCH", { phone: "invalid" }))).status).toBe(400);
    expect(mocks.api).not.toHaveBeenCalled();
  });
  it("uses existing session endpoints without If-Match and fixes the exclusion server-side", async () => {
    mocks.api.mockImplementation(async () => new Response(null, { status: 204 }));
    expect((await POST(request("POST", { excludeCurrent: "false", version: "" }))).status).toBe(
      200,
    );
    const all = mocks.api.mock.calls[0]?.[2] as RequestInit;
    expect(mocks.api.mock.calls[0]?.[0]).toBe("me/sessions/revoke-all");
    expect(JSON.parse(String(all.body))).toEqual({ excludeCurrent: true });
    expect(new Headers(all.headers).has("if-match")).toBe(false);
    expect(
      (await DELETE(request("DELETE"), { params: Promise.resolve({ sessionId: otherId }) })).status,
    ).toBe(200);
    expect(mocks.api.mock.calls[1]?.[0]).toBe(`me/sessions/${otherId}`);
    expect(new Headers((mocks.api.mock.calls[1]?.[2] as RequestInit).headers).has("if-match")).toBe(
      false,
    );
    expect(mocks.clear).not.toHaveBeenCalled();
    await DELETE(request("DELETE"), { params: Promise.resolve({ sessionId: contextId }) });
    expect(mocks.clear).toHaveBeenCalledOnce();
  });
  it("preserves the cookie when current-session revocation fails and surfaces the folio", async () => {
    mocks.api.mockResolvedValue(
      Response.json(
        {
          error: {
            code: "DEPENDENCY_UNAVAILABLE",
            message: "private details",
            correlationId: otherId,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 503 },
      ),
    );
    const response = await DELETE(request("DELETE"), {
      params: Promise.resolve({ sessionId: contextId }),
    });
    expect(response.status).toBe(503);
    expect((await response.json()).correlationId).toBe(otherId);
    expect(mocks.clear).not.toHaveBeenCalled();
  });
});
