import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
  }),
}));

import { POST as switchAccount } from "../../app/api/session-context/route";
import { POST as setFocus } from "../../app/api/session-context/focus/route";
import { DEMO_ACCOUNTS } from "../../server/demo/fixtures";
import {
  DEMO_COOKIE,
  decodeDemoState,
  defaultDemoState,
  encodeDemoState,
  type DemoState,
} from "../../server/demo/state";
import { sealSession, unsealSession, type BrowserSession } from "../../server/session/session";

const ORIGIN = "http://localhost:3000";
const SESSION_COOKIE = "ice24_session";
const ENV_KEYS = ["ICE24_DEMO_MODE", "BFF_SESSION_SECRET", "PRIVATE_API_URL"] as const;
const saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const env = process.env as Record<string, string | undefined>;

const post = (
  route: (request: Request) => Promise<Response>,
  path: string,
  fields: Record<string, string>,
  { origin = ORIGIN, json = true } = {},
) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return route(
    new Request(`${ORIGIN}${path}`, {
      method: "POST",
      body: form,
      headers: { origin, ...(json ? { accept: "application/json" } : {}) },
    }),
  );
};
const cookieOf = (response: Response, name: string) =>
  (response as unknown as { cookies: { get(n: string): { value: string } | undefined } }).cookies.get(
    name,
  )?.value;

beforeEach(() => cookieJar.clear());
afterEach(() => {
  for (const key of ENV_KEYS) env[key] = saved[key];
  for (const key of ENV_KEYS) if (saved[key] === undefined) delete env[key];
  vi.unstubAllGlobals();
});

describe("context switch in the demo (F6-08)", () => {
  const polar = DEMO_ACCOUNTS.polar;
  let state: DemoState;
  beforeEach(() => {
    env.ICE24_DEMO_MODE = "1";
    state = { ...defaultDemoState(), persona: "admin" };
    cookieJar.set(DEMO_COOKIE, encodeDemoState(state));
  });
  const demoState = (response: Response) => decodeDemoState(cookieOf(response, DEMO_COOKIE));

  it("stores a branch within reach, keeps the page and clears the browser cache", async () => {
    const branchId = polar.branches[0]!.id;
    const response = await post(setFocus, "/api/session-context/focus", {
      csrfToken: state.csrf,
      branchId,
      machineId: "",
      returnTo: "/files?tab=evidencias",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ location: "/files?tab=evidencias" });
    expect(response.headers.get("clear-site-data")).toBe('"cache"');
    expect(demoState(response)?.focus).toEqual({ branchId, machineId: null });
  });

  it("refuses a branch outside the persona's reach without touching the cookie", async () => {
    const response = await post(setFocus, "/api/session-context/focus", {
      csrfToken: state.csrf,
      branchId: polar.branches[1]!.id,
      machineId: "",
    });
    expect(response.status).toBe(404);
    expect(((await response.json()) as { message: string }).message).toContain("ya no está disponible");
    expect(cookieOf(response, DEMO_COOKIE)).toBeUndefined();
  });

  it("rejects a missing CSRF token, another origin and malformed ids", async () => {
    const fields = { branchId: "", machineId: "" };
    expect((await post(setFocus, "/api/session-context/focus", fields)).status).toBe(403);
    expect(
      (
        await post(setFocus, "/api/session-context/focus", { ...fields, csrfToken: state.csrf }, {
          origin: "https://evil.example",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await post(setFocus, "/api/session-context/focus", {
          csrfToken: state.csrf,
          branchId: "' or 1=1 --",
          machineId: "",
        })
      ).status,
    ).toBe(400);
  });

  it("switches account, drops the old focus and lands at the start of the same module", async () => {
    cookieJar.set(
      DEMO_COOKIE,
      encodeDemoState({ ...state, persona: "owner", focus: { branchId: polar.branches[0]!.id, machineId: null } }),
    );
    const response = await post(switchAccount, "/api/session-context", {
      csrfToken: state.csrf,
      accountId: DEMO_ACCOUNTS.bajio.id,
      returnTo: `/workspace/machines/${polar.machines[0]!.id}`,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ location: "/workspace" });
    expect(response.headers.get("clear-site-data")).toBe('"cache"');
    const next = demoState(response)!;
    expect(next.account).toBe("bajio");
    expect(next.focus).toBeUndefined();
  });

  it("lands on the first authorized destination when the module is not allowed there", async () => {
    // The technician cannot open the audit: after switching, the first destination it may open.
    cookieJar.set(DEMO_COOKIE, encodeDemoState({ ...state, persona: "technician" }));
    const response = await post(switchAccount, "/api/session-context", {
      csrfToken: state.csrf,
      accountId: DEMO_ACCOUNTS.bajio.id,
      returnTo: "/audit",
    });
    expect(await response.json()).toEqual({ location: "/workspace" });
  });

  it("refuses an account that is not one of the fixtures", async () => {
    const response = await post(switchAccount, "/api/session-context", {
      csrfToken: state.csrf,
      accountId: "00000000-0000-4000-8000-000000000000",
    });
    expect(response.status).toBe(409);
  });
});

describe("context focus with the real session (F6-08)", () => {
  const branchId = "b0000000-0000-4000-8000-000000000001";
  let session: BrowserSession;
  beforeEach(() => {
    delete env.ICE24_DEMO_MODE;
    env.BFF_SESSION_SECRET = "s".repeat(40);
    env.PRIVATE_API_URL = "http://api.test/v1";
    session = {
      accessToken: "token",
      refreshToken: "refresh",
      expiresAt: Date.now() + 60_000,
      csrfToken: "csrf",
      contextId: "f0000000-0000-4000-8000-000000000001",
    };
    cookieJar.set(SESSION_COOKIE, sealSession(session));
  });

  it("asks the API with the context header and seals only what the API accepted", async () => {
    const fetch = vi.fn(async () => Response.json({ branchId, machineId: null }));
    vi.stubGlobal("fetch", fetch);
    const response = await post(setFocus, "/api/session-context/focus", {
      csrfToken: "csrf",
      branchId,
      machineId: "",
      returnTo: "/workspace",
    });
    expect(response.status).toBe(200);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/v1/session-contexts/current/focus");
    expect((init.headers as Record<string, string>)["x-ice24-context-id"]).toBe(session.contextId);
    expect(JSON.parse(init.body as string)).toEqual({ branchId, machineId: null });
    expect(unsealSession(cookieOf(response, SESSION_COOKIE)!)?.focus).toEqual({
      branchId,
      machineId: null,
    });
  });

  it("keeps the previous focus when the API refuses it", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    const response = await post(setFocus, "/api/session-context/focus", {
      csrfToken: "csrf",
      branchId,
      machineId: "",
    });
    expect(response.status).toBe(404);
    expect(cookieOf(response, SESSION_COOKIE)).toBeUndefined();
  });

  it("treats a tampered session cookie as no session", async () => {
    const sealed = sealSession({ ...session, focus: { branchId, machineId: null } });
    const [iv, tag, data] = sealed.split(".");
    const flipped = `${data!.slice(0, -2)}${data!.endsWith("A") ? "B" : "A"}${data!.slice(-1)}`;
    cookieJar.set(SESSION_COOKIE, [iv, tag, flipped].join("."));
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await post(setFocus, "/api/session-context/focus", {
      csrfToken: "csrf",
      branchId,
      machineId: "",
    });
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("drops the focus of the previous account when switching", async () => {
    cookieJar.set(SESSION_COOKIE, sealSession({ ...session, focus: { branchId, machineId: null } }));
    const contextId = "f0000000-0000-4000-8000-000000000002";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/capabilities")
          ? Response.json({ permissions: ["files.read"], mfaVerified: false })
          : Response.json({ id: contextId }, { status: 201 }),
      ),
    );
    const response = await post(switchAccount, "/api/session-context", {
      csrfToken: "csrf",
      accountId: "a0000000-0000-4000-8000-000000000002",
      returnTo: "/files/abc",
    });
    expect(await response.json()).toEqual({ location: "/files" });
    const next = unsealSession(cookieOf(response, SESSION_COOKIE)!)!;
    expect(next.contextId).toBe(contextId);
    expect(next.focus).toBeUndefined();
  });

  it("keeps the /access/context form flow: redirect to the profile", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: session.contextId }, { status: 201 })));
    const response = await post(
      switchAccount,
      "/api/session-context",
      { csrfToken: "csrf", accountId: "a0000000-0000-4000-8000-000000000002" },
      { json: false },
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/profile`);
  });
});
