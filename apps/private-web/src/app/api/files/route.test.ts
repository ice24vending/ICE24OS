import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), api: vi.fn() }));
vi.mock("../../../server/session/session", async (original) => ({
  ...(await original<object>()),
  readBrowserSession: mocks.session,
}));
vi.mock("../../../server/session/supabase-auth", () => ({ callPrivateApi: mocks.api }));
import { GET } from "./route";
const request = (query = "", context = "context") =>
  new Request(`https://ice24.test/api/files${query}`, {
    headers: { "x-ice24-workspace-context": context },
  });
beforeEach(() => {
  mocks.session.mockResolvedValue({ accessToken: "server-secret", contextId: "context" });
  mocks.api.mockResolvedValue(Response.json({ items: [], nextCursor: null }));
});
afterEach(() => vi.resetAllMocks());
it("checks session and context before listing", async () => {
  expect((await GET(request("", "other"))).status).toBe(409);
  mocks.session.mockResolvedValue(undefined);
  expect((await GET(request())).status).toBe(401);
  expect(mocks.api).not.toHaveBeenCalled();
});
it("forwards only validated pagination and preserves a private response", async () => {
  expect((await GET(request("?limit=101"))).status).toBe(400);
  expect((await GET(request("?accountId=foreign"))).status).toBe(400);
  const response = await GET(request("?limit=2&cursor=abc"));
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(mocks.api).toHaveBeenCalledWith(
    "files?limit=2&cursor=abc",
    expect.anything(),
    expect.anything(),
  );
});
