import {
  accessContextSchema,
  accountDetailsSchema,
  activityInputSchema,
  accountMaintenanceActivitySchema,
  accountCatalogPageSchema,
  frequencyOverridesSchema,
  machineComponentsSchema,
  machineFrequenciesSchema,
  modelFrequenciesSchema,
  transferInputSchema,
  apiErrorSchema,
  contextFocusOptionsSchema,
  auditPageSchema,
  auditEventSchema,
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
import { DEMO_ACCOUNTS, DEMO_MODELS, demoIds, type DemoAccountKey } from "./fixtures";
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

describe("UXD-10 audit demo", () => {
  it("returns all correlated events and applies the other filters and cursor pagination", async () => {
    const correlationId = demoIds.correlation(1);
    const correlated = auditPageSchema.parse(
      (await call(`audit-events?correlationId=${correlationId}`, state())).body,
    );
    expect(correlated.items.map((event) => event.id).sort()).toEqual(
      [demoIds.audit(1), demoIds.audit(2)].sort(),
    );
    const filtered = auditPageSchema.parse(
      (
        await call(
          `audit-events?correlationId=${correlationId}&operation=FREQUENCY_OVERRIDE_CREATED`,
          state(),
        )
      ).body,
    );
    expect(filtered.items.map((event) => event.id)).toEqual([demoIds.audit(1)]);
    const first = auditPageSchema.parse((await call("audit-events?limit=10", state())).body);
    expect(first.page.hasMore).toBe(true);
    const second = auditPageSchema.parse(
      (await call(`audit-events?limit=10&cursor=${first.page.nextCursor}`, state())).body,
    );
    expect(second.page.hasMore).toBe(false);
    expect(new Set([...first.items, ...second.items].map((event) => event.id)).size).toBe(17);
    expect(new Set(first.items.map((event) => event.operation)).size).toBeGreaterThan(5);
    expect(
      auditPageSchema.parse((await call("audit-events?from=2027-01-01T00:00:00Z", state())).body)
        .items,
    ).toEqual([]);
  });
  it("enforces list and detail permissions for each persona without exposing foreign events", async () => {
    for (const persona of ["owner", "readonly"] as const) {
      const detail = await call(`audit-events/${demoIds.audit(1)}`, state({ persona }));
      expect(detail.status).toBe(200);
      expect(auditEventSchema.parse(detail.body).id).toBe(demoIds.audit(1));
    }
    for (const persona of ["technician", "admin"] as const) {
      expect((await call("audit-events", state({ persona }))).status).toBe(403);
      expect((await call(`audit-events/${demoIds.audit(1)}`, state({ persona }))).status).toBe(403);
    }
    const foreign = await call(`audit-events/${demoIds.audit(101)}`, state());
    const absent = await call(`audit-events/${demoIds.audit(999)}`, state());
    expect(foreign).toEqual(absent);
    expect(foreign.status).toBe(404);
    expect(
      auditPageSchema.parse(
        (await call(`audit-events?correlationId=${demoIds.correlation(101)}`, state())).body,
      ).items,
    ).toEqual([]);
  });
  it("keeps read-only and empty scenarios, and limits global detail to the global-list persona", async () => {
    expect(
      (await call(`audit-events/${demoIds.audit(1)}`, state({ mode: "READ_ONLY" }))).status,
    ).toBe(200);
    expect(
      auditPageSchema.parse((await call("audit-events", state({ scenario: "empty" }))).body).items,
    ).toEqual([]);
    expect(
      (await call(`audit-events/${demoIds.audit(1)}`, state({ scenario: "empty" }))).status,
    ).toBe(404);
    for (const persona of personas) {
      const result = await call(`admin/audit-events/${demoIds.audit(101)}`, state({ persona }));
      expect(result.status).toBe(persona === "platform" ? 200 : 403);
    }
  });
});

describe("UXD-00B equipment reads match the real stores", () => {
  it.each(accounts)(
    "populates every owner read in $0, including read-only accounts",
    async (account) => {
      const machine = DEMO_ACCOUNTS[account].machines[0]!;
      for (const mode of ["ACTIVE", "READ_ONLY"] as const) {
        const s = state({ account, mode, branch: machine.branchId });
        for (const [path, schema] of [
          [`machines/${machine.id}/components`, machineComponentsSchema],
          [`machines/${machine.id}/frequencies`, machineFrequenciesSchema],
          ["account-catalog-entries", accountCatalogPageSchema],
          ["account-frequency-overrides", frequencyOverridesSchema],
          [`technical-models/${machine.modelId}/frequencies`, modelFrequenciesSchema],
        ] as const) {
          const result = await call(path, s);
          expect(result.status, path).toBe(200);
          const data = schema.parse(result.body);
          expect("items" in data ? data.items.length : data.current.length, path).toBeGreaterThan(
            0,
          );
        }
        const detail = await call(`machines/${machine.id}`, s);
        expect(detail.status).toBe(200);
        expect(detail.body).toMatchObject({
          account_id: DEMO_ACCOUNTS[account].id,
          branch_id: machine.branchId,
          operational_status: machine.status,
          data: { internalName: machine.name },
        });
        const record = detail.body as Record<string, unknown>;
        for (const field of ["technical_status", "sanitary_status", "publication_status"])
          expect(record[field]).toBeTruthy();
        for (const field of ["created_at", "updated_at", "installed_at"])
          expect(Number.isFinite(Date.parse(String(record[field])))).toBe(true);
        expect(record).not.toHaveProperty("name");
        expect(record).not.toHaveProperty("status");
        expect((await call("machines", s)).body).toContainEqual(record);
        const schedules = await call(`machines/${machine.id}/schedules`, s);
        expect(schedules.status).toBe(200);
        for (const schedule of schedules.body as {
          component_catalog_id: string | null;
          definition: Record<string, unknown>;
        }[]) {
          const { schedule: snapshot, componentCatalogId, ...definition } = schedule.definition;
          expect(snapshot).toMatchObject({
            frequency: expect.any(Object),
            source: expect.any(String),
            factory: expect.any(Object),
          });
          if (schedule.component_catalog_id) {
            expect(componentCatalogId).toBe(schedule.component_catalog_id);
            expect(() => accountMaintenanceActivitySchema.parse(definition)).not.toThrow();
          } else expect(() => activityInputSchema.parse(definition)).not.toThrow();
        }
        expect(schedules.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              machine_id: machine.id,
              definition: expect.objectContaining({
                name: expect.any(String),
                schedule: expect.objectContaining({ frequency: expect.any(Object) }),
              }),
            }),
          ]),
        );
        const accountRow = await call(`accounts/${DEMO_ACCOUNTS[account].id}`, s);
        expect(accountRow.status).toBe(200);
        const details = accountDetailsSchema.parse(
          (accountRow.body as { details: unknown }).details,
        );
        expect(details.contact.phone).not.toBe("");
        expect(details.taxProfile.taxId).not.toBe("");
        expect(details.taxProfile.fiscalAddress).not.toBe("");
        expect(details.moduleConfiguration.maintenance).toBe(true);
        expect(accountRow.body).not.toHaveProperty("data");
      }
    },
  );

  it("uses the membership projection, including platform members, instead of a second data shape", async () => {
    const { status, body } = await call("account-users", state());
    expect(status).toBe(200);
    const members = body as { id: string; email: string; roles: string[]; status: string }[];
    expect(members).toHaveLength(Object.keys(DEMO_PERSONAS).length);
    for (const member of members) {
      expect(Object.keys(member).sort()).toEqual([
        "display_name",
        "email",
        "id",
        "roles",
        "row_version",
        "status",
      ]);
      expect(member.email).toMatch(/@demo\.invalid$/);
      expect(member.roles).toHaveLength(1);
      expect(member.status).toBe("ACTIVE");
    }
    expect(members.flatMap((member) => member.roles)).toEqual(
      expect.arrayContaining(["IA", "IO", "OW", "AU", "OP", "TC"]),
    );
  });

  it.each(["owner", "admin", "technician", "readonly"] as const)(
    "applies real read permissions and scope for %s",
    async (persona) => {
      const account = DEMO_ACCOUNTS.polar;
      const s = state({ persona, branch: account.branches[0]!.id });
      const scoped = persona === "admin" || persona === "technician";
      for (const suffix of ["", "/components", "/frequencies", "/schedules"]) {
        expect((await call(`machines/${account.machines[0]!.id}${suffix}`, s)).status).toBe(200);
        expect((await call(`machines/${account.machines[2]!.id}${suffix}`, s)).status).toBe(
          scoped ? 404 : 200,
        );
        expect(
          (await call(`machines/${DEMO_ACCOUNTS.bajio.machines[0]!.id}${suffix}`, s)).status,
        ).toBe(404);
        expect((await call(`machines/${demoIds.machine(999)}${suffix}`, s)).status).toBe(404);
        expect(
          (await call(`machines/${account.machines[0]!.id}${suffix}`, { ...s, mode: "SUSPENDED" }))
            .status,
        ).toBe(403);
      }
      // These account collections require equipment.read, not their write permissions.
      for (const path of ["account-catalog-entries", "account-frequency-overrides"])
        expect((await call(path, s)).status).toBe(200);
      for (const path of ["account-users", "machine-transfers", `accounts/${account.id}`])
        expect((await call(path, s)).status).toBe(scoped ? 404 : 200);
      expect(
        (await call(`technical-models/${account.machines[0]!.modelId}/frequencies`, s)).status,
      ).toBe(scoped ? 403 : 200);
    },
  );

  it("keeps configuration writes restricted while reads remain available", async () => {
    const machine = DEMO_ACCOUNTS.polar.machines[0]!;
    const paths = [
      `machines/${machine.id}/components`,
      `machines/${machine.id}/frequency-overrides`,
      "account-catalog-entries",
      "account-frequency-overrides",
    ];
    for (const path of paths) {
      for (const persona of ["technician", "readonly"] as const)
        expect((await call(path, state({ persona }), { method: "POST" })).status).toBe(403);
      const readOnly = await call(path, state({ mode: "READ_ONLY" }), { method: "POST" });
      expect(readOnly.status).toBe(403);
      expect(errorCode(readOnly.body)).toBe("ACCOUNT_READ_ONLY");
    }
    // There is deliberately no GET here in either implementation.
    expect((await call(`machines/${machine.id}/frequency-overrides`, state())).status).toBe(404);
  });

  it("provides distinct components, frequency sources, dates and a coherent per-model projection", async () => {
    for (const account of accounts) {
      const s = state({ account });
      for (const machine of DEMO_ACCOUNTS[account].machines) {
        const components = machineComponentsSchema.parse(
          (await call(`machines/${machine.id}/components`, s)).body,
        );
        expect(new Set(components.current.map((item) => item.origin)).size).toBe(3);
        expect(new Set(components.current.map((item) => item.validFrom)).size).toBe(3);
        expect(components.history.length).toBeGreaterThan(components.current.length);
        const frequencies = machineFrequenciesSchema.parse(
          (await call(`machines/${machine.id}/frequencies`, s)).body,
        );
        expect(frequencies.items.some((item) => item.source === "ACCOUNT")).toBe(true);
        expect(frequencies.items.some((item) => !item.warrantyApplies)).toBe(true);
        const model = modelFrequenciesSchema.parse(
          (await call(`technical-models/${machine.modelId}/frequencies`, s)).body,
        );
        for (const item of frequencies.items.filter((entry) => entry.componentCatalogId === null)) {
          expect(
            model.items.find((entry) => entry.activityCode === item.activityCode)?.machines,
          ).toContainEqual(
            expect.objectContaining({
              machineId: machine.id,
              frequency: item.frequency,
              source: item.source,
            }),
          );
        }
      }
    }
    const first = DEMO_ACCOUNTS.polar.machines[0]!;
    const frequencies = machineFrequenciesSchema.parse(
      (await call(`machines/${first.id}/frequencies`, state())).body,
    );
    expect(new Set(frequencies.items.map((item) => item.source))).toEqual(
      new Set(["TEMPLATE", "ACCOUNT", "MACHINE"]),
    );
    expect((await call(`technical-models/${demoIds.model(999)}/frequencies`, state())).status).toBe(
      404,
    );
    for (const model of DEMO_MODELS)
      expect(
        modelFrequenciesSchema.parse(
          (await call(`technical-models/${model.id}/frequencies`, state())).body,
        ).modelId,
      ).toBe(model.id);
  });

  it.each(accounts)(
    "returns only outgoing pending and approved transfers for %s",
    async (account) => {
      const transfers = await call("machine-transfers", state({ account }));
      expect(transfers.status).toBe(200);
      const rows = transfers.body as {
        account_id: string;
        to_account_id: string;
        status: string;
        data: unknown;
      }[];
      expect(rows.map((row) => row.status)).toEqual(["pending", "approved"]);
      for (const row of rows) {
        expect(row.account_id).toBe(DEMO_ACCOUNTS[account].id);
        expect(row.to_account_id).not.toBe(row.account_id);
        expect(() => transferInputSchema.parse(row.data)).not.toThrow();
      }
    },
  );

  it("isolates account catalog IDs, preserves the catalog projection and paginates like the API", async () => {
    const polar = accountCatalogPageSchema.parse(
      (await call("account-catalog-entries", state())).body,
    );
    const bajio = accountCatalogPageSchema.parse(
      (await call("account-catalog-entries", state({ account: "bajio" }))).body,
    );
    expect(polar.items.some((entry) => bajio.items.some((other) => other.id === entry.id))).toBe(
      false,
    );
    const catalog = (await call("catalogs", state())).body as {
      id: string;
      kind: string;
      scope: string;
      data: { name: string };
    }[];
    expect(catalog.every((row) => row.kind && row.scope && row.data.name)).toBe(true);
    expect(catalog.some((row) => bajio.items.some((other) => other.id === row.id))).toBe(false);
    const first = accountCatalogPageSchema.parse(
      (await call("account-catalog-entries?limit=1", state())).body,
    );
    expect(first.items).toHaveLength(1);
    expect(first.page.hasMore).toBe(true);
    const next = accountCatalogPageSchema.parse(
      (await call(`account-catalog-entries?cursor=${first.page.nextCursor}`, state())).body,
    );
    expect([...first.items, ...next.items]).toEqual(polar.items);
    expect((await call("account-catalog-entries?cursor=invalid", state())).status).toBe(400);
    expect(
      accountCatalogPageSchema.parse(
        (await call("account-catalog-entries?status=retired", state())).body,
      ).items,
    ).toEqual([]);
  });

  it("returns contract-valid empty collections while retaining the selected machine", async () => {
    const s = state({ scenario: "empty" });
    const machine = DEMO_ACCOUNTS.polar.machines[0]!;
    expect((await call(`machines/${machine.id}`, s)).status).toBe(200);
    expect(
      machineComponentsSchema.parse((await call(`machines/${machine.id}/components`, s)).body)
        .current,
    ).toEqual([]);
    expect(
      machineFrequenciesSchema.parse((await call(`machines/${machine.id}/frequencies`, s)).body)
        .items,
    ).toEqual([]);
    expect((await call(`machines/${machine.id}/schedules`, s)).body).toEqual([]);
    expect(
      accountCatalogPageSchema.parse((await call("account-catalog-entries", s)).body).items,
    ).toEqual([]);
    expect(
      frequencyOverridesSchema.parse((await call("account-frequency-overrides", s)).body).current,
    ).toEqual([]);
    expect((await call("machine-transfers", s)).body).toEqual([]);
    expect((await call("account-users", s)).body).toEqual([]);
  });

  it("preserves service failures with a support reference and offline failures for the new reads", async () => {
    const machine = DEMO_ACCOUNTS.polar.machines[0]!;
    for (const path of [
      `machines/${machine.id}/schedules`,
      `machines/${machine.id}/components`,
      "account-catalog-entries",
    ]) {
      const result = await call(path, state({ network: "error" }));
      expect(result.status).toBe(503);
      expect(apiErrorSchema.parse(result.body).error.correlationId).toBe(demoIds.correlation(999));
      await expect(demoApiResponse(path, {}, state({ network: "offline" }), NOW)).rejects.toThrow(
        TypeError,
      );
    }
  });
});

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
    await demoApiResponse("me/contexts", {}, state({ network: "slow" }), NOW);
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

describe("demo live announcement", () => {
  it("returns a scoped fictional acknowledgement, preserving version and permission checks", async () => {
    const current = state({ maintenance: "alert-announcement" });
    const items = notificationPageSchema.parse(
      (await call("notifications?pinned=true", current)).body,
    ).items;
    expect(items).toHaveLength(1);
    const item = items[0]!;
    const path = `notifications/${item.id}/acknowledge`;
    const init = {
      method: "POST",
      headers: { "idempotency-key": "demo-ack-0001", "if-match": '"1"' },
    };
    expect((await call(path, current, init)).status).toBe(200);
    expect(
      (await call(path, state({ maintenance: "alert-announcement", mode: "READ_ONLY" }), init))
        .status,
    ).toBe(403);
    expect(
      (await call(path, current, { ...init, headers: { ...init.headers, "if-match": '"2"' } }))
        .status,
    ).toBe(412);
    expect(
      (await call(`notifications/${demoIds.job(9999)}/acknowledge`, current, init)).status,
    ).toBe(404);
  });
});
