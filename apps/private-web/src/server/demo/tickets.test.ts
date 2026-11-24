import { describe, expect, it } from "vitest";
import { ticketPageSchema, ticketDetailSchema } from "@ice24/contracts";
import { demoApiResponse } from "./api";
import { defaultDemoState } from "./state";
import { DEMO_ACCOUNTS } from "./fixtures";
describe("ticket demo contracts and scope", () => {
  it("offers varied reports, global KPI, URL filters and server cursors", async () => {
    const state = defaultDemoState();
    const now = Date.parse("2026-11-23T18:00:00Z");
    const read = async (query = "") =>
      ticketPageSchema.parse(
        await (await demoApiResponse(`tickets?${query}`, {}, state, now)).json(),
      );
    const full = await read();
    expect(new Set(full.items.map((t) => t.description)).size).toBe(full.items.length);
    expect(new Set(full.items.map((t) => t.priority)).size).toBe(4);
    expect(new Set(full.items.map((t) => t.systemName)).size).toBeGreaterThan(3);
    expect(new Set(full.items.map((t) => t.state)).size).toBe(4);
    const first = await read("limit=1");
    const next = await read(`limit=1&cursor=${first.nextCursor}`);
    expect(next.items[0]!.id).not.toBe(first.items[0]!.id);
    expect(first.summary).toEqual(full.summary);
    const filtered = await read(`machineId=${full.items[0]!.machineId}&metric=unassigned`);
    expect(filtered.items).toHaveLength(1);
    expect(filtered.summary).toEqual(full.summary);
    expect((await read("from=2000-01-01&to=2000-01-01")).items).toEqual([]);
  });
  it("does not expose other branches through KPI or filter choices", async () => {
    const state = { ...defaultDemoState(), persona: "admin" as const };
    const all = ticketPageSchema.parse(await (await demoApiResponse("tickets", {}, state)).json());
    expect(all.filters?.branches.map((item) => item.id)).toEqual([state.branch]);
    const foreignBranch = DEMO_ACCOUNTS.polar.branches[1]!.id;
    expect(
      ticketPageSchema.parse(
        await (await demoApiResponse(`tickets?branchId=${foreignBranch}`, {}, state)).json(),
      ).items,
    ).toEqual([]);
    expect(all.items.every((ticket) => ticket.branchId === state.branch)).toBe(true);
  });
  it("keeps creation options unchanged and checks diagnosis permissions and version", async () => {
    const state = defaultDemoState();
    const path = "tickets/70000000-0000-4000-8000-000000000384/diagnosis";
    const init = {
      method: "POST",
      headers: { "if-match": 'W/"2"', "idempotency-key": "demo-diagnosis-key" },
      body: JSON.stringify({
        diagnosis: "Revisión del ventilador completada",
        reason: "Inspección física",
      }),
    };
    expect((await demoApiResponse(path, init, state)).status).toBe(201);
    expect(
      (
        await demoApiResponse(
          path,
          { ...init, headers: { ...init.headers, "if-match": "1" } },
          state,
        )
      ).status,
    ).toBe(409);
    expect((await demoApiResponse(path, init, { ...state, persona: "readonly" })).status).toBe(403);
    expect((await demoApiResponse(path, init, { ...state, mode: "READ_ONLY" })).status).toBe(403);
    const response = await demoApiResponse(
      `tickets/options/${DEMO_ACCOUNTS.polar.machines[0]!.id}`,
      {},
      state,
    );
    expect((await response.json()).systems).toEqual([
      { id: "60000000-0000-4000-8000-000000000002", name: "Refrigeración" },
    ]);
  });
  it.each(["owner", "admin", "technician", "readonly", "ice24", "platform"] as const)(
    "serves valid scoped data to %s",
    async (persona) => {
      const state = { ...defaultDemoState(), persona };
      const response = await demoApiResponse("tickets", {}, state);
      const page = ticketPageSchema.parse(await response.json());
      expect(page.items.length).toBeGreaterThan(0);
      const detail = await demoApiResponse(`tickets/${page.items[0]!.id}`, {}, state);
      expect(ticketDetailSchema.parse(await detail.json()).events).toHaveLength(2);
    },
  );
  it("denies disabled module and foreign account ticket", async () => {
    expect(
      (await demoApiResponse("tickets", {}, { ...defaultDemoState(), maintenance: "disabled" }))
        .status,
    ).toBe(403);
    expect(
      (
        await demoApiResponse(
          "tickets/70000000-0000-4000-8000-000000000384",
          {},
          { ...defaultDemoState(), account: "bajio" },
        )
      ).status,
    ).toBe(404);
  });
});
