import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ session: vi.fn(), csrf: vi.fn() }));
vi.mock("../../../server/session/session", () => ({
  readBrowserSession: fixtures.session,
  requireValidCsrf: fixtures.csrf,
}));
import { demoAccessToken, defaultDemoState, type DemoState } from "../../../server/demo/state";
import { POST } from "./route";

const asDemo = (change: Partial<DemoState> = {}) => {
  const state = { ...defaultDemoState(), ...change };
  fixtures.session.mockResolvedValue({
    contextId: "current",
    accessToken: demoAccessToken(state),
    csrfToken: state.csrf,
  });
};
const send = (fields: Record<string, string>) => {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return POST(
    new Request("http://localhost:3000/api/plantillas", {
      method: "POST",
      body,
      headers: { "x-ice24-workspace-context": "current", origin: "http://localhost:3000" },
    }),
  );
};
const valid = (key = crypto.randomUUID()) => ({ csrfToken: "t", key, action: "reading" });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ICE24_DEMO_MODE", "1");
  vi.stubEnv("NODE_ENV", "test");
  asDemo();
});
afterEach(() => vi.unstubAllEnvs());

describe("template actions BFF (demo only)", () => {
  it("answers the same folio for the same key: a retry never duplicates", async () => {
    const key = crypto.randomUUID();
    const first = await send(valid(key));
    const again = await send(valid(key));
    const other = await send(valid());
    expect(first.status).toBe(201);
    const [a, b, c] = await Promise.all([first.json(), again.json(), other.json()]);
    expect(b).toEqual({ folio: a.folio, replayed: true });
    expect(c.folio).not.toBe(a.folio);
  });

  it("returns the failures the demo panel selects, with the correlation for support", async () => {
    asDemo({ network: "error" });
    const error = await send(valid());
    expect(error.status).toBe(503);
    expect(await error.json()).toMatchObject({
      code: "DEPENDENCY_UNAVAILABLE",
      correlationId: expect.stringMatching(/^c0ffee00-/),
    });
    asDemo({ mode: "READ_ONLY" });
    expect(await (await send(valid())).json()).toMatchObject({ code: "ACCOUNT_READ_ONLY" });
    asDemo({ scenario: "forbidden" });
    expect((await send(valid())).status).toBe(403);
    asDemo({ scenario: "conflict" });
    const conflict = await send(valid());
    expect(conflict.status).toBe(412);
    expect(await conflict.json()).toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("rejects unknown actions, missing keys and other contexts", async () => {
    expect((await send({ csrfToken: "t", key: crypto.randomUUID(), action: "drop" })).status).toBe(
      400,
    );
    expect((await send({ csrfToken: "t", action: "reading" })).status).toBe(400);
    fixtures.session.mockResolvedValue({ contextId: "other", accessToken: "x", csrfToken: "t" });
    expect((await send(valid())).status).toBe(409);
  });

  it("does not exist for a real session", async () => {
    fixtures.session.mockResolvedValue({
      contextId: "current",
      accessToken: "real-jwt",
      csrfToken: "t",
    });
    expect((await send(valid())).status).toBe(404);
  });
});
