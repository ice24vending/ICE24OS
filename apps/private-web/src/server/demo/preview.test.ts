import { describe, expect, it } from "vitest";
import { isDemoModeEnabled } from "./mode";
import { normalizeDemoState, defaultDemoState } from "./state";

describe("ADR-026 protected preview", () => {
  const approved = {
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    ICE24_DEMO_MODE: "1",
    ICE24_DEMO_PREVIEW_APPROVED: "1",
    ICE24_DEMO_PROTECTION_VERIFIED: "1",
  };
  it("requires both explicit operational attestations", () => {
    expect(isDemoModeEnabled(approved)).toBe(true);
    for (const key of Object.keys(approved))
      expect(isDemoModeEnabled({ ...approved, [key]: undefined })).toBe(key === "NODE_ENV");
    expect(
      isDemoModeEnabled({
        ...approved,
        NODE_ENV: "development",
        ICE24_DEMO_PROTECTION_VERIFIED: undefined,
      }),
    ).toBe(false);
  });
  it("never enables a Vercel production deployment", () => {
    expect(isDemoModeEnabled({ ...approved, VERCEL_ENV: "production" })).toBe(false);
    expect(
      isDemoModeEnabled({ ...approved, VERCEL_ENV: "production", NODE_ENV: "development" }),
    ).toBe(false);
  });
  it("validates maintenance controls, preserving the previous selection on invalid input", () => {
    const base = { ...defaultDemoState(), maintenance: "pending" as const };
    expect(normalizeDemoState({ maintenance: "arbitrary" }, base).maintenance).toBe("pending");
    expect(normalizeDemoState({ maintenance: "revoked" }, base).maintenance).toBe("revoked");
  });
});
