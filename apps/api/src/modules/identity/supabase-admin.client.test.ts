import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseAdminClient } from "./supabase-admin.client.js";

describe("SupabaseAdminClient controlled recovery", () => {
  const provider = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-service-role");
    vi.stubEnv("PRIVATE_WEB_URL", "http://127.0.0.1:3000");
    vi.stubGlobal("fetch", provider);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("issues recovery and removes every prior factor", async () => {
    provider
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: "factor-a" }, { id: "factor-b" }]), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await new SupabaseAdminClient().issueControlledRecovery({
      identitySubject: "11111111-1111-4111-8111-111111111111",
      email: "target@example.test",
    });

    expect(provider).toHaveBeenCalledTimes(4);
    expect(provider.mock.calls[1]?.[0]).toBe("http://127.0.0.1:54321/auth/v1/recover");
    expect(provider.mock.calls[2]?.[1]).toMatchObject({ method: "DELETE" });
    expect(provider.mock.calls[3]?.[1]).toMatchObject({ method: "DELETE" });
  });

  it("does not remove factors when recovery issuance fails", async () => {
    provider
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "factor-a" }]), { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 503 }));

    await expect(
      new SupabaseAdminClient().issueControlledRecovery({
        identitySubject: "11111111-1111-4111-8111-111111111111",
        email: "target@example.test",
      }),
    ).rejects.toThrow("Identity recovery could not be issued");
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed factor responses", async () => {
    provider.mockResolvedValueOnce(new Response(JSON.stringify({ factors: [] }), { status: 200 }));
    await expect(
      new SupabaseAdminClient().issueControlledRecovery({
        identitySubject: "11111111-1111-4111-8111-111111111111",
        email: "target@example.test",
      }),
    ).rejects.toThrow("Identity provider returned invalid factors");
  });
});
