import { beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ session: vi.fn(), api: vi.fn(), authorize: vi.fn() }));
vi.mock("../../../../server/session/session", async (original) => ({
  ...(await original<object>()),
  readBrowserSession: f.session,
}));
vi.mock("../../../../server/session/supabase-auth", () => ({ callPrivateApi: f.api }));
vi.mock("../../../../features/work-orders/work-orders-authorization", () => ({
  authorizeWorkOrderBff: f.authorize,
}));
import { GET, POST } from "./route";
const id = "c0000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ path: ["orders", id, "download"] }) };
function request(
  csrf = "csrf",
  active = "context-a",
  version = "1",
  data = JSON.stringify({ deviceId: id }),
) {
  const body = new FormData();
  for (const [k, v] of Object.entries({ csrfToken: csrf, key: id, version, data })) body.set(k, v);
  return new Request("http://localhost/api/synchronization", {
    method: "POST",
    body,
    headers: { origin: "http://localhost", "x-ice24-workspace-context": active },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  f.session.mockResolvedValue({
    contextId: "context-a",
    csrfToken: "csrf",
    accessToken: "never-persist",
  });
  f.authorize.mockResolvedValue(null);
  f.api.mockResolvedValue(Response.json({ id }));
});
it.each([
  ["wrong", "context-a", "1", 403],
  ["csrf", "other", "1", 409],
  ["csrf", "context-a", "", 400],
])(
  "blocks invalid CSRF, context or version before forwarding (%s, %s, %s)",
  async (csrf, active, version, status) => {
    expect(
      (await POST(request(String(csrf), String(active), String(version)), context)).status,
    ).toBe(status);
    expect(f.api).not.toHaveBeenCalled();
  },
);
it("preserves the operation key and expected version without caching the download", async () => {
  const response = await POST(request(), context);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(f.api.mock.calls[0]?.[2].headers).toMatchObject({
    "idempotency-key": id,
    "if-match": 'W/"1"',
  });
});
it("does not accept malformed JSON", async () => {
  expect((await POST(request("csrf", "context-a", "1", "{"), context)).status).toBe(400);
  expect(f.api).not.toHaveBeenCalled();
});
it("checks administrative permission separately for release", async () => {
  await POST(request("csrf", "context-a", "1", JSON.stringify({ reason: "Dispositivo perdido" })), {
    params: Promise.resolve({ path: ["orders", id, "release"] }),
  });
  expect(f.authorize).toHaveBeenCalledWith(expect.anything(), "assign");
});
it("rejects cross-site session bootstrap", async () => {
  expect(
    (
      await GET(
        new Request("http://localhost/api/synchronization/health", {
          headers: { "sec-fetch-site": "cross-site" },
        }),
        { params: Promise.resolve({ path: ["health"] }) },
      )
    ).status,
  ).toBe(403);
  expect(f.api).not.toHaveBeenCalled();
});
it("does not forward when permission was revoked", async () => {
  f.authorize.mockResolvedValue(Response.json({}, { status: 403 }));
  expect((await POST(request(), context)).status).toBe(403);
  expect(f.api).not.toHaveBeenCalled();
});
