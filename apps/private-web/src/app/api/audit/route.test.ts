import { beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ session: vi.fn(), api: vi.fn() }));
vi.mock("../../../server/session/session", () => ({ readBrowserSession: fixtures.session }));
vi.mock("../../../server/session/supabase-auth", () => ({ callPrivateApi: fixtures.api }));
import { GET } from "./route";
const request = (query = "", context = "current") =>
  new Request(`https://private.test/api/audit?${query}`, {
    headers: { "x-ice24-workspace-context": context },
  });
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.session.mockResolvedValue({ contextId: "current", accessToken: "secret" });
  fixtures.api.mockResolvedValue(
    Response.json({ items: [], page: { hasMore: false, nextCursor: null } }),
  );
});
describe("audit BFF", () => {
  it("rejects stale account contexts and expired sessions before forwarding", async () => {
    expect((await GET(request("", "old"))).status).toBe(409);
    fixtures.session.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("only forwards validated read filters and never accepts arbitrary paths", async () => {
    for (const query of ["scope=../admin", "path=accounts", "limit=500", "actorUserId=invalid"])
      expect((await GET(request(query))).status).toBe(400);
    expect(fixtures.api).not.toHaveBeenCalled();
    const response = await GET(request("scope=global&result=FAILED"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fixtures.api.mock.calls[0]?.[0]).toBe("admin/audit-events?limit=25&result=FAILED");
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
  it("preserves permission errors and rejects malformed upstream data", async () => {
    fixtures.api.mockResolvedValueOnce(Response.json({}, { status: 403 }));
    expect((await GET(request())).status).toBe(403);
    fixtures.api.mockResolvedValueOnce(Response.json({ raw: "internal" }));
    expect((await GET(request())).status).toBe(503);
  });
});
