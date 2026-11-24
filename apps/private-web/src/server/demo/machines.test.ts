import { describe, expect, it, vi } from "vitest";
import { machineOverviewSchema } from "@ice24/contracts";
import { demoApiResponse } from "./api";
import { defaultDemoState } from "./state";
const now = Date.parse("2026-11-22T18:00:00Z");
describe("machine overview demo", () => {
  it("has varied dates, tickets, states and names; role changes preserve values and scope", async () => {
    const state = defaultDemoState();
    const rows = machineOverviewSchema
      .array()
      .parse(await (await demoApiResponse("machines/overview", {}, state, now)).json());
    expect(rows).toHaveLength(8);
    expect(new Set(rows.map((row) => row.openTickets)).size).toBeGreaterThan(2);
    expect(new Set(rows.map((row) => row.lastMaintenanceAt)).size).toBeGreaterThan(4);
    expect(rows.some((row) => row.lastMaintenanceAt === null)).toBe(true);
    expect(
      rows.some((row) => row.nextMaintenanceAt && Date.parse(row.nextMaintenanceAt) < now),
    ).toBe(true);
    for (const persona of ["admin", "technician", "readonly"] as const) {
      const scoped = machineOverviewSchema
        .array()
        .parse(
          await (await demoApiResponse("machines/overview", {}, { ...state, persona }, now)).json(),
        );
      expect(scoped).toEqual(
        rows.filter((row) => persona === "readonly" || row.branch_id === state.branch),
      );
    }
    const other = machineOverviewSchema
      .array()
      .parse(
        await (
          await demoApiResponse("machines/overview", {}, { ...state, account: "bajio" }, now)
        ).json(),
      );
    expect(other.every((row) => !rows.some((own) => own.id === row.id))).toBe(true);
  });
  it("supports successful empty and read-only data, failure with reference, slow and offline", async () => {
    const state = defaultDemoState();
    expect(
      await (
        await demoApiResponse("machines/overview", {}, { ...state, scenario: "empty" }, now)
      ).json(),
    ).toEqual([]);
    expect(
      (await demoApiResponse("machines/overview", {}, { ...state, mode: "READ_ONLY" }, now)).ok,
    ).toBe(true);
    const error = await demoApiResponse(
      "machines/overview",
      {},
      { ...state, network: "error" },
      now,
    );
    expect(error.status).toBe(503);
    expect((await error.json()).error.correlationId).toBeTruthy();
    await expect(
      demoApiResponse("machines/overview", {}, { ...state, network: "offline" }, now),
    ).rejects.toThrow();
    vi.useFakeTimers();
    try {
      const response = demoApiResponse("machines/overview", {}, { ...state, network: "slow" }, now);
      await vi.runAllTimersAsync();
      expect((await response).ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
