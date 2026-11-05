import { beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("../../server/session/supabase-auth", () => ({ callPrivateApi: fixtures.api }));
import { authorizeWorkOrderBff } from "./work-orders-authorization";
import { demoApiResponse } from "../../server/demo/api";
import { demoBrowserSession } from "../../server/demo/session";
import { defaultDemoState } from "../../server/demo/state";
beforeEach(() => vi.resetAllMocks());
describe("tickets BFF authorization uses trusted API context", () => {
  it.each(["owner", "admin", "technician", "readonly", "ice24", "platform"] as const)(
    "enforces %s role for reads and writes",
    async (persona) => {
      const state = { ...defaultDemoState(), persona };
      fixtures.api.mockImplementation((path: string) => demoApiResponse(path, {}, state));
      const session = demoBrowserSession(state);
      expect(await authorizeWorkOrderBff(session, "read")).toBeNull();
      const response = await authorizeWorkOrderBff(session, "assign");
      if (["owner", "admin"].includes(persona)) expect(response).toBeNull();
      else expect(response?.status).toBe(403);
    },
  );
  it("blocks readonly writes and disabled modules before forwarding commands", async () => {
    const state = { ...defaultDemoState(), mode: "READ_ONLY" as const };
    fixtures.api.mockImplementation((path: string) => demoApiResponse(path, {}, state));
    const response = await authorizeWorkOrderBff(demoBrowserSession(state), "assign");
    expect(response).not.toBeNull();
    expect((await response!.json()).code).toBe("ACCOUNT_READ_ONLY");
    const disabled = { ...defaultDemoState(), maintenance: "disabled" as const };
    fixtures.api.mockImplementation((path: string) => demoApiResponse(path, {}, disabled));
    expect((await authorizeWorkOrderBff(demoBrowserSession(disabled), "read"))?.status).toBe(403);
  });
  it("fails closed when the API cannot establish permissions", async () => {
    fixtures.api.mockRejectedValue(new Error("unavailable"));
    expect(
      (await authorizeWorkOrderBff(demoBrowserSession(defaultDemoState()), "assign"))?.status,
    ).toBe(503);
  });
});
