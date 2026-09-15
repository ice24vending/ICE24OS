import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  clear: vi.fn(),
  api: vi.fn(),
  provider: vi.fn(),
}));
vi.mock("../../../../server/session/session", async (original) => ({
  ...(await original<object>()),
  readBrowserSession: mocks.read,
  clearBrowserSession: mocks.clear,
}));
vi.mock("../../../../server/session/supabase-auth", () => ({
  callPrivateApi: mocks.api,
  getSupabaseConfiguration: () => ({ url: "http://127.0.0.1:54321" }),
  supabaseHeaders: () => ({}),
}));
import { POST } from "./route";

describe("logout CSRF and remote revocation (SEC-08 / SES-08)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.read.mockResolvedValue({ accessToken: "synthetic", csrfToken: "csrf-client-one" });
    mocks.api.mockResolvedValue(new Response(null, { status: 204 }));
    mocks.provider.mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", mocks.provider);
  });
  afterEach(() => vi.unstubAllGlobals());
  const request = (origin: string | undefined, csrf: string | undefined) => {
    const body = new FormData();
    if (csrf !== undefined) body.set("csrfToken", csrf);
    return new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: origin === undefined ? {} : { origin },
      body,
    });
  };
  it.each([
    ["http://localhost:3000", undefined],
    ["http://localhost:3000", "wrong"],
    ["http://localhost:3000", "csrf-client-two"],
    ["https://foreign.example.test", "csrf-client-one"],
    [undefined, "csrf-client-one"],
  ])("rejects origin=%s csrf=%s without revocation or cookie deletion", async (origin, csrf) => {
    expect((await POST(request(origin, csrf))).status).toBe(403);
    expect(mocks.api).not.toHaveBeenCalled();
    expect(mocks.provider).not.toHaveBeenCalled();
    expect(mocks.clear).not.toHaveBeenCalled();
  });
  it("clears the cookie only after both revocations succeed", async () => {
    expect((await POST(request("http://localhost:3000", "csrf-client-one"))).status).toBe(303);
    expect(mocks.api).toHaveBeenCalledOnce();
    expect(mocks.provider).toHaveBeenCalledOnce();
    expect(mocks.clear).toHaveBeenCalledOnce();
  });
  it.each(["api", "provider"] as const)(
    "reports %s failure without claiming global logout",
    async (dependency) => {
      mocks[dependency].mockResolvedValue(new Response(null, { status: 503 }));
      expect((await POST(request("http://localhost:3000", "csrf-client-one"))).status).toBe(503);
      expect(mocks.clear).not.toHaveBeenCalled();
    },
  );
});
