import { describe, expect, it } from "vitest";
import { demoApiResponse, DemoRequest } from "./api";
import { defaultDemoState } from "./state";
import { DEMO_ACCOUNTS } from "./fixtures";
import { machineDetailFixture } from "./machine-detail";
const machine = DEMO_ACCOUNTS.polar.machines[0]!;
const now = Date.parse("2026-11-23T18:00:00Z");
describe("UXD-04 demo machine detail", () => {
  it("varies conditions, dates, component warranties and handles missing records", async () => {
    const state = defaultDemoState();
    const request = new DemoRequest(state, now);
    const rows = request.machines.map((row) => machineDetailFixture(request, row.id)!);
    expect(new Set(rows.map((row) => row.technical_status)).size).toBeGreaterThan(1);
    expect(
      new Set(Object.values(rows[0]!.conditionDates!).map((stamp) => stamp.changedAt)).size,
    ).toBe(4);
    const result = await demoApiResponse(`machines/${machine.id}/components`, {}, state, now);
    const components = await result.json();
    expect(
      components.current.some((row: { warrantyUntil: unknown }) => row.warrantyUntil === null),
    ).toBe(true);
    const empty = machineDetailFixture(
      new DemoRequest({ ...state, scenario: "empty" }, now),
      machine.id,
    )!;
    expect(empty.technical_status).toBeNull();
    expect(empty.conditionDates?.technical.changedAt).toBeNull();
  });
  it("authorizes edits, rejects stale versions and keeps fictional changes per browser", async () => {
    const state = defaultDemoState();
    const path = `machines/${machine.id}`;
    const init = {
      method: "PATCH",
      headers: { "if-match": "3", "idempotency-key": "edit-test" },
      body: JSON.stringify({ internalName: "Centro actualizado", commercialBrand: "Polar" }),
    };
    expect(
      (await demoApiResponse(path, init, { ...state, persona: "technician" }, now)).status,
    ).toBe(403);
    expect((await demoApiResponse(path, init, { ...state, mode: "READ_ONLY" }, now)).status).toBe(
      403,
    );
    expect((await demoApiResponse(path, init, state, now)).status).toBe(200);
    expect((await demoApiResponse(path, init, state, now)).status).toBe(200);
    const stale = { ...init, headers: { ...init.headers, "idempotency-key": "new-edit" } };
    expect((await demoApiResponse(path, stale, state, now)).status).toBe(412);
    expect(
      (await (await demoApiResponse(path + "/status", {}, state, now)).json()).data.internalName,
    ).toBe("Centro actualizado");
    expect(
      (await (await demoApiResponse(path + "/status", {}, defaultDemoState(), now)).json()).data
        .internalName,
    ).toBe(machine.name);
  });
  it("separates loading/error/offline and enforces object scope", async () => {
    const state = defaultDemoState();
    const path = `machines/${machine.id}/status`;
    const error = await demoApiResponse(path, {}, { ...state, network: "error" }, now);
    expect(error.status).toBe(503);
    expect((await error.json()).error.correlationId).toBeTruthy();
    await expect(
      demoApiResponse(path, {}, { ...state, network: "offline" }, now),
    ).rejects.toThrow();
    const other = DEMO_ACCOUNTS.polar.machines.find((row) => row.branchId !== state.branch)!;
    expect(
      (
        await demoApiResponse(
          `machines/${other.id}/status`,
          {},
          { ...state, persona: "admin" },
          now,
        )
      ).status,
    ).toBe(404);
  });
});
