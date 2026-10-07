import { beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ session: vi.fn(), api: vi.fn() }));
vi.mock("../../../server/session/session", () => ({ readBrowserSession: fixtures.session }));
vi.mock("../../../server/session/supabase-auth", () => ({ callPrivateApi: fixtures.api }));
import { GET } from "./route";

const correlation = "22222222-2222-4222-8222-222222222222";
const request = (query = "", context = "current") =>
  new Request(`https://private.test/api/integration-logs?${query}`, {
    headers: { "x-ice24-workspace-context": context },
  });
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.session.mockResolvedValue({ contextId: "current", accessToken: "secret" });
  fixtures.api.mockResolvedValue(
    Response.json({ items: [], page: { hasMore: false, nextCursor: null } }),
  );
});

describe("integration logs BFF (job diagnosis)", () => {
  it("rejects stale contexts and expired sessions before forwarding", async () => {
    expect((await GET(request(`correlationId=${correlation}`, "old"))).status).toBe(409);
    fixtures.session.mockResolvedValue(null);
    expect((await GET(request(`correlationId=${correlation}`))).status).toBe(401);
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("forwards only a correlation, cursor and limit", async () => {
    for (const query of [
      "",
      "correlationId=x",
      `correlationId=${correlation}&accountId=${correlation}`,
      `correlationId=${correlation}&status=FAILED`,
    ])
      expect((await GET(request(query))).status).toBe(400);
    expect(fixtures.api).not.toHaveBeenCalled();
    const response = await GET(request(`correlationId=${correlation}&limit=50`));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fixtures.api.mock.calls[0]?.[0]).toBe(
      `admin/integration-logs?limit=50&correlationId=${correlation}`,
    );
  });
  it("keeps the permission code and rejects malformed upstream data", async () => {
    fixtures.api.mockResolvedValueOnce(
      Response.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "upstream",
            correlationId: correlation,
            timestamp: "2026-10-06T12:00:00.000Z",
          },
        },
        { status: 403 },
      ),
    );
    const denied = await GET(request(`correlationId=${correlation}`));
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("MFA"),
    });
    fixtures.api.mockResolvedValueOnce(Response.json({ items: [{ raw: true }] }));
    expect((await GET(request(`correlationId=${correlation}`))).status).toBe(503);
  });
});
