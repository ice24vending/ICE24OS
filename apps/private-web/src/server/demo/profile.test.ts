import { describe, expect, it } from "vitest";
import {
  userProfileSchema,
  sessionSummarySchema,
  myActivitySchema,
  myMfaStatusSchema,
} from "@ice24/contracts";
import { demoApiResponse } from "./api";
import { defaultDemoState, type DemoState } from "./state";
import { ROLE_PERMISSIONS, DEMO_PERSONAS } from "./personas";

describe("UXD-11 demo profile", () => {
  const call = (state: DemoState, route: string, init: RequestInit = {}) =>
    demoApiResponse(route, init, state);
  it.each(["owner", "technician", "readonly", "admin"] as const)(
    "follows %s self-service grants with varied data",
    async (persona) => {
      const state = { ...defaultDemoState(), persona, mode: "READ_ONLY" as const };
      const profile = userProfileSchema.parse(await (await call(state, "me")).json());
      expect(profile.displayName).toBe(DEMO_PERSONAS[persona].displayName);
      const sessions = sessionSummarySchema
        .array()
        .parse(await (await call(state, "me/sessions")).json());
      expect(new Set(sessions.map((s) => s.deviceSummary)).size).toBe(3);
      expect(
        myActivitySchema.array().parse(await (await call(state, "me/activity")).json()),
      ).toHaveLength(10);
      expect(myMfaStatusSchema.safeParse(await (await call(state, "me/mfa")).json()).success).toBe(
        true,
      );
      const changed = await call(state, "me", {
        method: "PATCH",
        headers: { "if-match": 'W/"1"' },
        body: JSON.stringify({ displayName: "Nombre editado" }),
      });
      expect(changed.status).toBe(
        ROLE_PERMISSIONS[DEMO_PERSONAS[persona].role].includes("identity.profile-update")
          ? 200
          : 403,
      );
      expect((await (await call(state, "me")).json()).displayName).toBe("Nombre editado");
      expect(
        (
          await call(state, "me", {
            method: "PATCH",
            headers: { "if-match": 'W/"1"' },
            body: JSON.stringify({ displayName: "Obsoleto" }),
          })
        ).status,
      ).toBe(412);
      const own = myActivitySchema.array().parse(await (await call(state, "me/activity")).json());
      expect(own[0]?.operation).toBe("identity.profile-update");
    },
  );
  it("isolates demo sessions and excludes the current session only when requested", async () => {
    const state = defaultDemoState();
    await call(state, "me/sessions/revoke-all", {
      method: "POST",
      body: JSON.stringify({ excludeCurrent: true }),
    });
    const sessions = sessionSummarySchema
      .array()
      .parse(await (await call(state, "me/sessions")).json());
    expect(sessions.find((s) => s.current)?.revokedAt).toBeNull();
    expect(sessions.filter((s) => !s.current).every((s) => s.revokedAt !== null)).toBe(true);
    const other = defaultDemoState();
    expect(
      ((await (await call(other, "me/sessions")).json()) as { revokedAt: string | null }[]).filter(
        (s) => !s.revokedAt,
      ),
    ).toHaveLength(2);
    await call(state, "me/sessions/revoke-all", { method: "POST", body: "{}" });
    expect(
      ((await (await call(state, "me/sessions")).json()) as { revokedAt: string | null }[]).every(
        (s) => s.revokedAt,
      ),
    ).toBe(true);
  });
  it("keeps the current session in the empty state, and reports network failures", async () => {
    const state = { ...defaultDemoState(), scenario: "empty" as const };
    expect(await (await call(state, "me/activity")).json()).toEqual([]);
    expect(await (await call(state, "me/sessions")).json()).toHaveLength(1);
    expect((await call({ ...state, network: "error" }, "me/sessions")).status).toBe(503);
    await expect(call({ ...state, network: "offline" }, "me")).rejects.toThrow();
  });
});
