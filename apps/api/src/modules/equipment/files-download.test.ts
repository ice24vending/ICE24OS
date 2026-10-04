import { afterEach, describe, expect, it, vi } from "vitest";
import { FilesStore } from "./files.store.js";
import { audit, type EquipmentDatabase } from "./equipment.database.js";
import type * as EquipmentModule from "./equipment.database.js";

vi.mock("./equipment.database.js", async (original) => ({
  ...(await original<typeof EquipmentModule>()),
  one: vi.fn().mockResolvedValue({
    id: "file",
    account_id: "account",
    object_key: "account/object",
    sha256: "digest",
  }),
  scope: vi.fn(),
  audit: vi.fn(),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
function setup() {
  vi.stubEnv("SUPABASE_URL", "https://storage.example.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fixture-service-key");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ signedURL: "/object/sign/quarantine/account/object?token=fixture" }),
        ),
      ),
  );
  const db = {
    run: vi.fn(async (_request, _operation, _body, _write, callback) => callback({}, {})),
  };
  return new FilesStore(db as unknown as EquipmentDatabase);
}
describe("F5-10 legacy evidence download audit", () => {
  it("records issuance before returning and never persists the signed URL", async () => {
    const result = await setup().download({ headers: {} } as never, "file");
    expect(result.expiresIn).toBe(60);
    expect(audit).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        id: "file",
        account_id: "account",
        status: "AUTHORIZED",
        sha256: "digest",
      }),
      "EVIDENCE_DOWNLOAD_AUTHORIZED",
      expect.any(String),
    );
    expect(JSON.stringify(vi.mocked(audit).mock.calls)).not.toContain("token=");
  });
  it("withholds the URL when the transactional audit cannot be persisted", async () => {
    vi.mocked(audit).mockRejectedValueOnce(new Error("Audit unavailable"));
    await expect(setup().download({ headers: {} } as never, "file")).rejects.toThrow(
      "Audit unavailable",
    );
  });
});
