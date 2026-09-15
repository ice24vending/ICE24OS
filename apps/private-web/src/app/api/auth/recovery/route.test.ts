import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  provider: vi.fn(),
}));
vi.mock("../../../../server/session/supabase-auth", () => ({
  getSupabaseConfiguration: () => ({ url: "http://127.0.0.1:54321" }),
  recordSecurityEvent: mocks.audit,
  supabaseHeaders: () => ({ "content-type": "application/json" }),
}));
import { POST } from "./route";

describe("blind recovery response and truthful audit (REC-01 / REC-17)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.provider.mockResolvedValue(new Response(null, { status: 200 }));
    mocks.audit.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", mocks.provider);
  });
  afterEach(() => vi.unstubAllGlobals());

  const request = (email: string, origin = "http://localhost:3000") => {
    const body = new FormData();
    body.set("email", email);
    return new Request("http://localhost:3000/api/auth/recovery", {
      method: "POST",
      headers: { origin },
      body,
    });
  };

  it("returns the same public redirect after provider acceptance", async () => {
    const response = await POST(request("known@example.test"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/?recovery=sent");
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "RECOVERY_REQUESTED", result: "SUCCESS" }),
    );
  });

  it("keeps the public response blind while auditing provider failure", async () => {
    mocks.provider.mockResolvedValue(new Response(null, { status: 503 }));
    const response = await POST(request("unknown@example.test"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/?recovery=sent");
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "RECOVERY_REQUESTED",
        result: "FAILED",
        reason: "RECOVERY_REQUEST_NOT_ACCEPTED",
      }),
    );
  });

  it("does not contact the provider for a cross-origin request", async () => {
    const response = await POST(request("known@example.test", "https://foreign.example.test"));
    expect(response.status).toBe(303);
    expect(mocks.provider).not.toHaveBeenCalled();
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "RECOVERY_REQUESTED", result: "FAILED" }),
    );
  });
});
