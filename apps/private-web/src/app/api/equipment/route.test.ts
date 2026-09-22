import { beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ session: vi.fn(), api: vi.fn() }));
vi.mock("../../../server/session/session", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  readBrowserSession: fixtures.session,
}));
vi.mock("../../../server/session/supabase-auth", () => ({ callPrivateApi: fixtures.api }));
import { GET, POST } from "./route";
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.session.mockResolvedValue({
    contextId: "context-a",
    csrfToken: "csrf-test",
    accessToken: "server-only",
  });
  fixtures.api.mockResolvedValue(Response.json({ id: "resource" }));
});
describe("equipment BFF isolation", () => {
  it("rejects unauthenticated access", async () => {
    fixtures.session.mockResolvedValue(undefined);
    expect((await GET(new Request("http://localhost/api/equipment?path=branches"))).status).toBe(
      401,
    );
  });
  it("rejects stale browser context before any upstream request", async () => {
    expect(
      (
        await GET(
          new Request("http://localhost/api/equipment?path=branches", {
            headers: { "x-ice24-workspace-context": "context-b" },
          }),
        )
      ).status,
    ).toBe(409);
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("blocks paths outside the equipment allowlist", async () => {
    expect(
      (
        await GET(
          new Request("http://localhost/api/equipment?path=identity-recovery-cases", {
            headers: { "x-ice24-workspace-context": "context-a" },
          }),
        )
      ).status,
    ).toBe(400);
  });
  it("requires matching Origin and CSRF for writes", async () => {
    const form = new FormData();
    form.set("csrfToken", "wrong");
    expect(
      (
        await POST(
          new Request("http://localhost/api/equipment", {
            method: "POST",
            headers: { origin: "http://attacker.test", "x-ice24-workspace-context": "context-a" },
            body: form,
          }),
        )
      ).status,
    ).toBe(403);
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("keeps the upstream access token on the server", async () => {
    const response = await GET(
      new Request("http://localhost/api/equipment?path=branches", {
        headers: { "x-ice24-workspace-context": "context-a" },
      }),
    );
    expect(await response.json()).toEqual({ id: "resource" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
