import { describe, expect, it } from "vitest";
import { DemoRequest } from "../../server/demo/api";
import { machineOverview } from "../../server/demo/machines";
import { defaultDemoState } from "../../server/demo/state";
import { machineRows, maintenanceDate } from "./model";
const rows = machineOverview(
  new DemoRequest(defaultDemoState(), Date.parse("2026-11-22T18:00:00Z")),
);
describe("machine list filters and ordering", () => {
  it("combines accent-insensitive name, serial, branch and operational state", () => {
    const sort = { columnId: "folio", direction: "ascending" } as const;
    expect(machineRows(rows, "juarez", rows[0]!.branch_id, "available", sort)).toEqual([rows[0]]);
    expect(machineRows(rows, "DEMO-0001", "", "", sort)).toEqual([rows[0]]);
    expect(machineRows(rows, "juarez", "", "out_of_service", sort)).toEqual([]);
    expect(machineRows(rows, rows[0]!.machine_code, "", "", sort)).toEqual([rows[0]]);
  });
  it("sorts every column both ways, keeps missing dates last and never mutates the input", () => {
    const before = [...rows];
    for (const columnId of ["folio", "name", "branch", "status", "last", "next", "tickets"]) {
      const ascending = machineRows(rows, "", "", "", { columnId, direction: "ascending" });
      const descending = machineRows(rows, "", "", "", { columnId, direction: "descending" });
      expect(ascending).toHaveLength(rows.length);
      expect(ascending[0]).not.toEqual(descending[0]);
      if (columnId === "last" || columnId === "next") {
        expect(ascending.at(-1)!.lastMaintenanceAt).toBeNull();
        expect(descending.at(-1)!.lastMaintenanceAt).toBeNull();
      }
    }
    const numeric = [
      { ...rows[0]!, id: "a", openTickets: 12 },
      { ...rows[0]!, id: "b", openTickets: 2 },
    ];
    expect(
      machineRows(numeric, "", "", "", { columnId: "tickets", direction: "ascending" }).map(
        (row) => row.openTickets,
      ),
    ).toEqual([2, 12]);
    expect(rows).toEqual(before);
  });
  it("formats dates in Mexico City and preserves unknown dates", () => {
    expect(maintenanceDate(null, "Sin registro")).toBe("Sin registro");
    expect(maintenanceDate("2026-11-22T02:00:00Z", "")).toMatch(/^21 nov/);
  });
});
