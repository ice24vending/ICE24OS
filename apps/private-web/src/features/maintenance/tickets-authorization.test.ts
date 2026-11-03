import { beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("../../server/session/supabase-auth", () => ({ callPrivateApi: fixtures.api }));
import { authorizeTicketBff } from "./tickets-authorization";
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
      expect(await authorizeTicketBff(session, "read")).toBeNull();
      const response = await authorizeTicketBff(session, "create");
      if (["owner", "admin", "technician"].includes(persona)) expect(response).toBeNull();
      else expect(response?.status).toBe(403);
    },
  );
  it("blocks readonly writes and disabled modules before forwarding commands", async () => {
    const state = { ...defaultDemoState(), mode: "READ_ONLY" as const };
    fixtures.api.mockImplementation((path: string) => demoApiResponse(path, {}, state));
    const response = await authorizeTicketBff(demoBrowserSession(state), "edit");
    expect(response).not.toBeNull();
    expect((await response!.json()).code).toBe("ACCOUNT_READ_ONLY");
    const disabled = { ...defaultDemoState(), maintenance: "disabled" as const };
    fixtures.api.mockImplementation((path: string) => demoApiResponse(path, {}, disabled));
    expect((await authorizeTicketBff(demoBrowserSession(disabled), "read"))?.status).toBe(403);
  });
  it("fails closed when the API cannot establish permissions", async () => {
    fixtures.api.mockRejectedValue(new Error("unavailable"));
    expect(
      (await authorizeTicketBff(demoBrowserSession(defaultDemoState()), "create"))?.status,
    ).toBe(503);
  });
});
