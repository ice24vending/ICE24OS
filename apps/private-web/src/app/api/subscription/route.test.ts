import { beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ session: vi.fn(), api: vi.fn(), write: vi.fn() }));
vi.mock("../../../server/session/session", async (original) => ({
  ...(await original<object>()),
  readBrowserSession: fixtures.session,
  writeBrowserSession: fixtures.write,
}));
vi.mock("../../../server/session/supabase-auth", () => ({ callPrivateApi: fixtures.api }));
import { POST } from "./route";
const accountId = "00000000-0000-4000-8000-000000000001";
function request(overrides: Record<string, string> = {}, headers: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    action: "checkout",
    key: "stable-key-123",
    csrfToken: "csrf",
    ...overrides,
  }))
    form.set(key, value);
  return new Request("https://app.example/api/subscription", {
    method: "POST",
    body: form,
    headers: { origin: "https://app.example", "x-ice24-workspace-context": "context", ...headers },
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PRIVATE_WEB_URL", "https://app.example");
  fixtures.session.mockResolvedValue({
    accessToken: "server-secret",
    contextId: "context",
    csrfToken: "csrf",
  });
  fixtures.api.mockImplementation(async (path: string) =>
    path === "session-contexts"
      ? Response.json({ id: "production-context" })
      : Response.json({
          url: path.endsWith("checkout")
            ? "https://checkout.stripe.com/c/pay/test"
            : "https://billing.stripe.com/p/session/test",
          expiresAt: null,
          accountId,
        }),
  );
});
describe("subscription BFF", () => {
  it("rejects expired sessions and stale context before upstream calls", async () => {
    expect((await POST(request({}, { "x-ice24-workspace-context": "other" }))).status).toBe(409);
    fixtures.session.mockResolvedValue(undefined);
    expect((await POST(request())).status).toBe(401);
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("requires origin and CSRF and allows only billing actions", async () => {
    expect((await POST(request({}, { origin: "https://evil.test" }))).status).toBe(403);
    expect((await POST(request({ csrfToken: "wrong" }))).status).toBe(403);
    expect((await POST(request({ action: "../admin" }))).status).toBe(400);
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it.each(["checkout", "portal"])(
    "creates %s with server return URLs and selects only the API-authorized account",
    async (action) => {
      const response = await POST(
        request({ action, accountId: "attacker", returnUrl: "https://evil.test" }),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      const init = fixtures.api.mock.calls[0]![2] as RequestInit;
      expect(JSON.parse(String(init.body))).toEqual(
        action === "checkout"
          ? {
              returnUrl: "https://app.example/subscription?billing=returned",
              cancelUrl: "https://app.example/subscription?billing=cancelled",
            }
          : { returnUrl: "https://app.example/subscription" },
      );
      expect(init.headers).toMatchObject({ "idempotency-key": "stable-key-123" });
      expect(JSON.parse(fixtures.api.mock.calls[1]![2].body)).toEqual({ accountId });
      expect(fixtures.write).toHaveBeenCalledWith(
        response,
        expect.objectContaining({ contextId: "production-context" }),
      );
      expect(await response.text()).not.toContain("server-secret");
    },
  );
  it("normalizes forbidden responses and never changes context on rejection", async () => {
    fixtures.api.mockResolvedValue(Response.json({ secret: "do-not-expose" }, { status: 403 }));
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("do-not-expose");
    expect(fixtures.write).not.toHaveBeenCalled();
  });
  it("rejects foreign redirect hosts and failed context activation", async () => {
    fixtures.api.mockResolvedValueOnce(
      Response.json({ url: "https://evil.test", accountId, expiresAt: null }),
    );
    expect((await POST(request())).status).toBe(503);
    fixtures.api
      .mockResolvedValueOnce(
        Response.json({ url: "https://checkout.stripe.com/test", accountId, expiresAt: null }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    expect((await POST(request())).status).toBe(503);
    expect(fixtures.write).not.toHaveBeenCalled();
  });
});
