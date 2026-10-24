import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
  }),
}));

import { GET, POST } from "../../app/api/demo/route";
import { readBrowserSession } from "../session/session";
import { callPrivateApi } from "../session/supabase-auth";
import { isDemoModeEnabled } from "./mode";
import { isDemoSession, readDemoSession } from "./session";
import {
  DEMO_COOKIE,
  decodeDemoState,
  defaultDemoState,
  demoAccessToken,
  encodeDemoState,
} from "./state";

const ENV_KEYS = ["ICE24_DEMO_MODE", "NODE_ENV", "VERCEL_ENV"] as const;
const saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const setEnv = (values: Partial<Record<(typeof ENV_KEYS)[number], string>>) => {
  for (const key of ENV_KEYS) {
    const value = values[key];
    if (value === undefined) delete (process.env as Record<string, string | undefined>)[key];
    else (process.env as Record<string, string | undefined>)[key] = value;
  }
};
const demoCookie = encodeDemoState(defaultDemoState());

beforeEach(() => cookieJar.clear());
afterEach(() => {
  setEnv(saved as Record<string, string>);
  vi.unstubAllGlobals();
});

describe("demo mode switch", () => {
  it.each([
    [{ ICE24_DEMO_MODE: "1", NODE_ENV: "development" }, true],
    [{ ICE24_DEMO_MODE: "1", NODE_ENV: "test" }, true],
    [{ ICE24_DEMO_MODE: "1", NODE_ENV: "development", VERCEL_ENV: "preview" }, true],
    [{ NODE_ENV: "development" }, false],
    [{ ICE24_DEMO_MODE: "true", NODE_ENV: "development" }, false],
    [{ ICE24_DEMO_MODE: "0", NODE_ENV: "development" }, false],
    [{ ICE24_DEMO_MODE: "1", NODE_ENV: "production" }, false],
    [{ ICE24_DEMO_MODE: "1", NODE_ENV: "development", VERCEL_ENV: "production" }, false],
  ])("%o → %s", (env, expected) => {
    expect(isDemoModeEnabled(env)).toBe(expected);
  });
});

describe("outside the demo mode, authentication is never bypassed", () => {
  const disabled = [
    { NODE_ENV: "development" },
    { ICE24_DEMO_MODE: "1", NODE_ENV: "production" },
    { ICE24_DEMO_MODE: "1", NODE_ENV: "development", VERCEL_ENV: "production" },
  ];

  it.each(disabled)("ignores a demo cookie: no session (%o)", async (env) => {
    setEnv(env);
    cookieJar.set(DEMO_COOKIE, demoCookie);
    expect(readDemoSession(demoCookie)).toBeUndefined();
    await expect(readBrowserSession()).resolves.toBeUndefined();
  });

  it.each(disabled)("sends a demo-looking token to the real API (%o)", async (env) => {
    setEnv(env);
    process.env.PRIVATE_API_URL = "http://127.0.0.1:3001/v1";
    const fetch = vi.fn(async () => new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetch);
    const token = demoAccessToken(defaultDemoState());
    expect(isDemoSession({ accessToken: token })).toBe(false);
    const response = await callPrivateApi("subscription", { accessToken: token });
    expect(response.status).toBe(401);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]).toEqual([
      "http://127.0.0.1:3001/v1/subscription",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: `Bearer ${token}` }),
      }),
    ]);
  });

  it.each(disabled)("hides the demo route (%o)", async (env) => {
    setEnv(env);
    expect(GET(new Request("http://localhost:3000/api/demo")).status).toBe(404);
    const form = new FormData();
    form.set("persona", "owner");
    const post = await POST(
      new Request("http://localhost:3000/api/demo", {
        method: "POST",
        body: form,
        headers: { origin: "http://localhost:3000", cookie: `${DEMO_COOKIE}=${demoCookie}` },
      }),
    );
    expect(post.status).toBe(404);
  });
});

describe("inside the demo mode", () => {
  beforeEach(() => setEnv({ ICE24_DEMO_MODE: "1", NODE_ENV: "development" }));

  it("has no session until the demo is started", async () => {
    await expect(readBrowserSession()).resolves.toBeUndefined();
  });

  it("starts on the deep link it was opened for, never outside the private web (F6-11)", () => {
    const start = (next: string) =>
      GET(
        new Request(`http://localhost:3000/api/demo?next=${encodeURIComponent(next)}`),
      ).headers.get("location");
    expect(start("/plantillas/detalle?machine=m1")).toBe(
      "http://localhost:3000/plantillas/detalle?machine=m1",
    );
    expect(start("//evil.test")).toBe("http://localhost:3000/workspace");
    expect(start("/\t/evil.test")).toBe("http://localhost:3000/workspace");
  });

  it("starts as the owner and answers from the fixtures without calling the API", async () => {
    const response = GET(new Request("http://localhost:3000/api/demo"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/workspace");
    const cookie = response.cookies.get(DEMO_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    cookieJar.set(DEMO_COOKIE, cookie!.value);
    const session = await readBrowserSession();
    expect(session?.contextId).toBeDefined();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const answer = await callPrivateApi("session-contexts/current", session!);
    expect(answer.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });

  const post = (fields: Record<string, string>, origin = "http://localhost:3000") => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    return POST(
      new Request("http://localhost:3000/api/demo", {
        method: "POST",
        body: form,
        headers: { origin, cookie: `${DEMO_COOKIE}=${demoCookie}` },
      }),
    );
  };
  const csrf = decodeDemoState(demoCookie)!.csrf;

  it("rejects panel changes without its CSRF token or from another origin", async () => {
    expect((await post({ persona: "technician" })).status).toBe(403);
    expect(
      (await post({ persona: "technician", csrfToken: csrf }, "https://evil.example")).status,
    ).toBe(403);
  });

  it("switches persona and mode, and only returns to internal pages", async () => {
    const response = await post({
      csrfToken: csrf,
      persona: "technician",
      account: "polar",
      mode: "READ_ONLY",
      network: "online",
      returnTo: "//evil.example/steal",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/workspace");
    const next = decodeDemoState(response.cookies.get(DEMO_COOKIE)!.value);
    expect(next).toMatchObject({ persona: "technician", mode: "READ_ONLY", csrf });
  });

  it("can only select fictitious personas and accounts", async () => {
    const response = await post({ csrfToken: csrf, persona: "root", account: "real-customer" });
    const next = decodeDemoState(response.cookies.get(DEMO_COOKIE)!.value);
    expect(next).toMatchObject({ persona: "owner", account: "polar" });
  });

  it("keeps only known template scenarios and «Con datos» clears it", async () => {
    const cookie = async (scenario: string) =>
      decodeDemoState((await post({ csrfToken: csrf, scenario })).cookies.get(DEMO_COOKIE)!.value);
    expect((await cookie("conflict"))?.scenario).toBe("conflict");
    expect((await cookie("drop-tables"))?.scenario).toBeUndefined();
    expect((await cookie("normal"))?.scenario).toBeUndefined();
  });

  it("leaves the demo by clearing its cookie", async () => {
    const response = await post({ csrfToken: csrf, action: "exit" });
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    expect(response.cookies.get(DEMO_COOKIE)?.value).toBe("");
  });
});
