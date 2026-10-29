import {
  accessContextSchema,
  apiErrorSchema,
  contextFocusOptionsSchema,
  auditPageSchema,
  equipmentConfigurationAccessSchema,
  jobDetailSchema,
  jobPageSchema,
  notificationPageSchema,
  notificationSummarySchema,
  queueOverviewSchema,
  sessionSummarySchema,
  subscriptionViewSchema,
  userProfileSchema,
} from "@ice24/contracts";
import { describe, expect, it } from "vitest";

import { DEMO_SLOW_MS, demoApiResponse } from "./api";
import { DEMO_ACCOUNTS, demoIds, type DemoAccountKey } from "./fixtures";
import { DEMO_PERSONAS, type DemoPersonaKey } from "./personas";
import type { DemoState } from "./state";

const NOW = Date.parse("2026-10-10T15:00:00.000Z");
const state = (overrides: Partial<DemoState> = {}): DemoState => ({
  persona: "owner",
  account: "polar",
  branch: DEMO_ACCOUNTS.polar.branches[0]!.id,
  mode: "ACTIVE",
  network: "online",
  csrf: "c".repeat(32),
  ...overrides,
});
const call = async (path: string, s: DemoState, init: RequestInit = {}) => {
  const response = await demoApiResponse(path, init, s, NOW);
  return { status: response.status, body: (await response.json()) as unknown };
};
const errorCode = (body: unknown) => apiErrorSchema.parse(body).error.code;

const personas = Object.keys(DEMO_PERSONAS) as DemoPersonaKey[];
const accounts = Object.keys(DEMO_ACCOUNTS) as DemoAccountKey[];
const modes = ["ACTIVE", "READ_ONLY", "SUSPENDED"] as const;

describe("demo API data follows the API contracts", () => {
  const combinations = personas.flatMap((persona) =>
    accounts.flatMap((account) => modes.map((mode) => ({ persona, account, mode }))),
  );

  it.each(combinations)("$persona · $account · $mode", async ({ persona, account, mode }) => {
    const s = state({ persona, account, mode, branch: DEMO_ACCOUNTS[account].branches[1]!.id });
    const parsed: Record<string, { schema: { parse: (v: unknown) => unknown } }> = {
      "session-contexts/current": { schema: accessContextSchema },
      me: { schema: userProfileSchema },
      subscription: { schema: subscriptionViewSchema },
      "audit-events?limit=25": { schema: auditPageSchema },
      "admin/jobs?limit=25": { schema: jobPageSchema },
      "notifications/summary": { schema: notificationSummarySchema },
      "notifications?limit=20": { schema: notificationPageSchema },
      "notifications?pinned=true&limit=20": { schema: notificationPageSchema },
      "admin/job-queues": { schema: queueOverviewSchema },
    };
    for (const [path, { schema }] of Object.entries(parsed)) {
      const { status, body } = await call(path, s);
      if (status === 200) expect(() => schema.parse(body), path).not.toThrow();
      else expect(errorCode(body), path).toMatch(/^(FORBIDDEN|ACCOUNT_READ_ONLY)$/);
    }
    const contexts = await call("me/contexts", s);
    expect(accessContextSchema.array().parse(contexts.body)).toHaveLength(accounts.length);
    // A suspended account denies everything (`authorize` → account_suspended), like the API.
    const sessions = await call("me/sessions", s);
    const workspace = await call("equipment-workspace", s);
    if (mode === "SUSPENDED") {
      expect(errorCode(sessions.body)).toBe("FORBIDDEN");
      expect(errorCode(workspace.body)).toBe("FORBIDDEN");
      return;
    }
    expect(() => sessionSummarySchema.array().parse(sessions.body)).not.toThrow();
    expect(() =>
      equipmentConfigurationAccessSchema.parse(
        (workspace.body as { configuration: unknown }).configuration,
      ),
    ).not.toThrow();
  });

  it("serves a valid job detail with its transitions", async () => {
    const admin = state({ persona: "platform" });
    const page = jobPageSchema.parse((await call("admin/jobs", admin)).body);
    const failed = page.items.find((job) => job.status === "DEAD_LETTER")!;
    const detail = jobDetailSchema.parse((await call(`admin/jobs/${failed.id}`, admin)).body);
    expect(detail.transitions.at(-1)?.toStatus).toBe("DEAD_LETTER");
  });
});

describe("demo API authorizes with @ice24/authorization like the API", () => {
  it("lets only billing roles read the subscription", async () => {
    expect((await call("subscription", state({ persona: "owner" }))).status).toBe(200);
    expect((await call("subscription", state({ persona: "ice24" }))).status).toBe(200);
    for (const persona of ["admin", "technician", "readonly"] as const) {
      const { status, body } = await call("subscription", state({ persona }));
      expect(status).toBe(403);
      expect(errorCode(body)).toBe("FORBIDDEN");
    }
  });

  it("shows the account audit to owner and auditor; the global one only to ICE24 Admin", async () => {
    expect((await call("audit-events", state({ persona: "owner" }))).status).toBe(200);
    expect((await call("audit-events", state({ persona: "readonly" }))).status).toBe(200);
    expect((await call("audit-events", state({ persona: "technician" }))).status).toBe(403);
    for (const persona of personas)
      expect([persona, (await call("admin/audit-events", state({ persona }))).status]).toEqual([
        persona,
        persona === "platform" ? 200 : 403,
      ]);
  });

  it("opens the job center only to ICE24 Admin, like the API (jobs.admin-read)", async () => {
    for (const persona of personas)
      expect([persona, (await call("admin/jobs", state({ persona }))).status]).toEqual([
        persona,
        persona === "platform" ? 200 : 403,
      ]);
  });

  it("answers the shell capabilities with the persona's readable permissions", async () => {
    const technician = (
      await call("session-contexts/current/capabilities", state({ persona: "technician" }))
    ).body as { permissions: string[]; mfaVerified: boolean };
    expect(technician.permissions).toContain("files.read");
    expect(technician.permissions).not.toContain("audit.read");
    expect(technician.mfaVerified).toBe(true);
    const suspended = (
      await call("session-contexts/current/capabilities", state({ mode: "SUSPENDED" }))
    ).body as { permissions: string[] };
    expect(suspended.permissions).toEqual([]);
  });

  it("accepts navigation denials without storing them", async () => {
    const response = await demoApiResponse(
      "session-contexts/current/navigation-denials",
      { method: "POST", body: "{}" },
      state({ persona: "technician" }),
      NOW,
    );
    expect(response.status).toBe(204);
  });

  it("offers each persona only the branches and machines within reach (F6-08)", async () => {
    const polar = DEMO_ACCOUNTS.polar;
    const branch = polar.branches[1]!.id;
    const options = async (persona: DemoPersonaKey) =>
      contextFocusOptionsSchema.parse(
        (await call("session-contexts/current/focus-options", state({ persona, branch }))).body,
      );
    expect((await options("owner")).machines).toHaveLength(polar.machines.length);
    for (const persona of ["admin", "technician"] as const) {
      const reach = await options(persona);
      expect(reach.branches.map((item) => item.id)).toEqual([branch]);
      expect(reach.machines.every((machine) => machine.branchId === branch)).toBe(true);
    }
  });

  it("accepts a focus within reach and refuses one outside it, like the API", async () => {
    const polar = DEMO_ACCOUNTS.polar;
    const focus = (body: unknown, s = state({ persona: "admin" })) =>
      call("session-contexts/current/focus", s, { method: "POST", body: JSON.stringify(body) });
    const own = polar.branches[0]!.id;
    const ownMachine = polar.machines.find((machine) => machine.branchId === own)!.id;
    expect((await focus({ branchId: own, machineId: ownMachine })).status).toBe(200);
    // Another branch, another account, a machine of another branch and extra fields.
    for (const body of [
      { branchId: polar.branches[1]!.id, machineId: null },
      { branchId: DEMO_ACCOUNTS.bajio.branches[0]!.id, machineId: null },
      { branchId: own, machineId: polar.machines[2]!.id },
    ])
      expect((await focus(body)).status).toBe(404);
    expect((await focus({ branchId: null, machineId: null, accountId: polar.id })).status).toBe(
      400,
    );
    // Going back to «all» works in read-only accounts too.
    expect(
      (await focus({ branchId: null, machineId: null }, state({ mode: "READ_ONLY" }))).status,
    ).toBe(200);
  });

  it("limits the branch administrator and the technician to their branch", async () => {
    const polar = DEMO_ACCOUNTS.polar;
    const branch = polar.branches[1]!.id;
    for (const persona of ["admin", "technician"] as const) {
      const machines = (await call("machines", state({ persona, branch }))).body as {
        branch_id: string;
      }[];
      expect(machines.length).toBeGreaterThan(0);
      expect(machines.every((machine) => machine.branch_id === branch)).toBe(true);
    }
    const all = (await call("machines", state({ persona: "owner" }))).body as unknown[];
    expect(all).toHaveLength(polar.machines.length);
  });

  it("exposes the RA-01-D2 configuration access per role", async () => {
    const configuration = async (persona: DemoPersonaKey) =>
      equipmentConfigurationAccessSchema.parse(
        ((await call("equipment-workspace", state({ persona }))).body as { configuration: unknown })
          .configuration,
      );
    expect(await configuration("owner")).toEqual({
      accountCatalog: true,
      accountFrequencies: "edit",
      machineBranches: "ALL",
    });
    expect(await configuration("admin")).toEqual({
      accountCatalog: false,
      accountFrequencies: "hidden",
      machineBranches: [DEMO_ACCOUNTS.polar.branches[0]!.id],
    });
    expect(await configuration("readonly")).toEqual({
      accountCatalog: false,
      accountFrequencies: "read",
      machineBranches: [],
    });
  });

  it("denies writes with the API's codes and never stores allowed ones", async () => {
    const machine = DEMO_ACCOUNTS.polar.machines[0]!; // first branch
    const other = DEMO_ACCOUNTS.polar.machines[2]!; // second branch
    const post = { method: "POST" };
    const own = await call(
      `machines/${machine.id}/frequency-overrides`,
      state({ persona: "admin" }),
      post,
    );
    expect(own.status).toBe(503);
    expect(errorCode(own.body)).toBe("DEPENDENCY_UNAVAILABLE");
    const foreign = await call(
      `machines/${other.id}/frequency-overrides`,
      state({ persona: "admin" }),
      post,
    );
    expect(foreign.status).toBe(403);
    expect(errorCode(foreign.body)).toBe("FORBIDDEN");
    const readOnly = await call("branches", state({ mode: "READ_ONLY" }), post);
    expect(errorCode(readOnly.body)).toBe("ACCOUNT_READ_ONLY");
    const auditor = await call("branches", state({ persona: "readonly" }), post);
    expect(errorCode(auditor.body)).toBe("FORBIDDEN");
    const suspended = await call("me", state({ mode: "SUSPENDED" }));
    expect(errorCode(suspended.body)).toBe("FORBIDDEN");
  });

  it("isolates accounts: another account's record is not found", async () => {
    const { status } = await call(
      `accounts/${DEMO_ACCOUNTS.bajio.id}`,
      state({ account: "polar" }),
    );
    expect(status).toBe(404);
    expect((await call(`accounts/${DEMO_ACCOUNTS.polar.id}`, state())).status).toBe(200);
  });

  it("pins the critical payment alert only for the owner of a read-only paid account", async () => {
    const pinned = async (s: DemoState) =>
      notificationPageSchema.parse((await call("notifications?pinned=true", s)).body).items;
    expect(await pinned(state({ mode: "READ_ONLY" }))).toHaveLength(1);
    expect(await pinned(state({ mode: "READ_ONLY", persona: "admin" }))).toHaveLength(0);
    expect(await pinned(state())).toHaveLength(0);
  });
});

describe("demo network simulation", () => {
  it("fails like an unreachable API when offline", async () => {
    await expect(demoApiResponse("me", {}, state({ network: "offline" }), NOW)).rejects.toThrow(
      TypeError,
    );
  });

  it("answers 503 when the service fails", async () => {
    const { status, body } = await call("me", state({ network: "error" }));
    expect(status).toBe(503);
    expect(errorCode(body)).toBe("DEPENDENCY_UNAVAILABLE");
  });

  it("delays every answer when slow", async () => {
    const started = performance.now();
    await demoApiResponse("subscription", {}, state({ network: "slow" }), NOW);
    expect(performance.now() - started).toBeGreaterThanOrEqual(DEMO_SLOW_MS - 50);
  }, 10_000);

  it("keeps the account shell reads fast so each screen shows its loading state", async () => {
    const started = performance.now();
    await demoApiResponse("session-contexts/current", {}, state({ network: "slow" }), NOW);
    await demoApiResponse(
      "session-contexts/current/capabilities",
      {},
      state({ network: "slow" }),
      NOW,
    );
    await demoApiResponse("me", {}, state({ network: "slow" }), NOW);
    await demoApiResponse("audit-events?limit=1", {}, state({ network: "slow" }), NOW);
    expect(performance.now() - started).toBeLessThan(DEMO_SLOW_MS / 2);
  });

  it("never repeats an audit event id across accounts", async () => {
    const ids = await Promise.all(
      accounts.map(
        async (account) =>
          auditPageSchema.parse((await call("audit-events", state({ account }))).body).items,
      ),
    ).then((pages) => pages.flat().map((event) => event.id));
    expect(ids.length).toBeGreaterThan(20);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses fictitious identifiers only", () => {
    expect(demoIds.account(1)).toMatch(/^a0000000-0000-4000-8000-0{11}1$/);
  });
});
