import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
  }),
}));

import { DEMO_SLOW_MS } from "./api";
import { DEMO_ACCOUNTS, demoIds } from "./fixtures";
import { loadTemplateData } from "./templates";
import { DEMO_COOKIE, defaultDemoState, encodeDemoState, type DemoState } from "./state";

function select(overrides: Partial<DemoState> = {}) {
  cookieJar.set(DEMO_COOKIE, encodeDemoState({ ...defaultDemoState(), ...overrides }));
}

beforeEach(() => {
  vi.stubEnv("ICE24_DEMO_MODE", "1");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("ICE24_DEMO_CAPTURE_LOADING", "0");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("Unexpected external request"))),
  );
  cookieJar.clear();
  select();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("UXD-00 demo examples", () => {
  it("keeps the six existing rows while the new example has varied, identifiable records", async () => {
    const legacy = await loadTemplateData();
    const base = await loadTemplateData({ example: "base" });
    expect(legacy.machines).toHaveLength(6);
    expect(legacy.machines[0]).toMatchObject({
      code: "ICE24-MTY-0001",
      name: "Despachadora Juárez",
      productionKg: 412,
      lastService: "14/10/2026",
    });
    expect(base.failure).toBeNull();
    expect(base.machines).toHaveLength(8);
    expect(new Set(base.machines.map((machine) => machine.name)).size).toBe(8);
    expect(new Set(base.machines.map((machine) => machine.branch)).size).toBe(2);
    expect(new Set(base.machines.map((machine) => machine.model)).size).toBe(3);
    expect(new Set(base.machines.map((machine) => machine.operation)).size).toBeGreaterThan(1);
    expect(base.machines.find((machine) => machine.id === demoIds.machine(10))?.productionKg).toBe(
      0,
    );
    expect(
      base.machines.find((machine) => machine.id === demoIds.machine(8))?.productionKg,
    ).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["owner", "technician", "readonly", "admin"] as const)(
    "uses the real %s scope and keeps readings stable after filtering",
    async (persona) => {
      const owner = await loadTemplateData({ example: "base" });
      const branch = DEMO_ACCOUNTS.polar.branches[1]!;
      select({ persona, branch: branch.id });
      const selected = await loadTemplateData({ example: "base" });
      expect(selected.failure).toBeNull();
      expect(selected.machines.length).toBeGreaterThan(0);
      for (const machine of selected.machines) {
        expect(machine).toEqual(owner.machines.find((candidate) => candidate.id === machine.id));
        if (persona === "admin" || persona === "technician")
          expect(machine.branch).toBe(branch.name);
      }
      if (persona === "owner" || persona === "readonly") expect(selected.machines).toHaveLength(8);
    },
  );

  it("keeps the second account distinct, including an offline machine", async () => {
    select({ account: "bajio", branch: DEMO_ACCOUNTS.bajio.branches[0]!.id });
    const data = await loadTemplateData({ example: "base" });
    expect(data.accountName).toBe("Agua y Hielo del Bajío");
    expect(data.machines).toHaveLength(4);
    expect(data.machines.some((machine) => machine.operation === "off")).toBe(true);
    expect(data.machines.every((machine) => !machine.code.includes("MTY"))).toBe(true);
  });

  it("serves empty and read-only examples without changing the account fixtures", async () => {
    select({ scenario: "empty" });
    expect((await loadTemplateData({ example: "base" })).machines).toEqual([]);
    select({ mode: "READ_ONLY" });
    const readOnly = await loadTemplateData({ example: "base" });
    expect(readOnly.readOnly).toBe(true);
    expect(readOnly.machines).toHaveLength(8);
    expect(DEMO_ACCOUNTS.polar.machines).toHaveLength(8);
  });

  it("returns a support folio for errors and a distinct disconnected state", async () => {
    select({ network: "error" });
    const error = await loadTemplateData({ example: "base" });
    expect(error.machines).toEqual([]);
    expect(error.failure).toEqual({ kind: "error", correlationId: demoIds.correlation(999) });
    select({ network: "offline" });
    expect((await loadTemplateData({ example: "base" })).failure).toEqual({ kind: "offline" });
  });

  it("waits for the slow data response so the loading boundary can render", async () => {
    vi.useFakeTimers();
    select({ network: "slow" });
    let resolved = false;
    const pending = loadTemplateData({ example: "base" }).then((data) => {
      resolved = true;
      return data;
    });
    await vi.advanceTimersByTimeAsync(DEMO_SLOW_MS - 1);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending).machines).toHaveLength(8);
  });

  it("does not expose examples without a demo session", async () => {
    cookieJar.clear();
    await expect(loadTemplateData({ example: "base" })).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });
});
