import { describe, expect, it, vi } from "vitest";

import { clearProtectedLocalData, OFFLINE_SCHEMA_VERSION } from "./index.js";

describe("offline foundation", () => {
  it("starts with an explicit schema version", () => {
    expect(OFFLINE_SCHEMA_VERSION).toBe(1);
  });

  it("clears protected data when a session or permission is revoked", async () => {
    const clear = vi.fn<() => Promise<void>>().mockResolvedValue();
    await clearProtectedLocalData({ clear });
    expect(clear).toHaveBeenCalledOnce();
  });
});
