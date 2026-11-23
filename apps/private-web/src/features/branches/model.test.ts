import { describe, expect, it } from "vitest";
import { branchReturn, branchRows, machineTotal } from "./model";
import { branch } from "./test-fixture";
describe("branch list model", () => {
  it("searches accents, filters status and sorts numerically", () => {
    const rows = [branch, { ...branch, id: "b", status: "archived" as const, machineCounts: {} }];
    expect(
      branchRows(rows, "juarez", "active", { columnId: "name", direction: "ascending" }),
    ).toEqual([branch]);
    expect(branchRows(rows, "", "", { columnId: "machines", direction: "ascending" })[0]!.id).toBe(
      "b",
    );
    expect(machineTotal(branch)).toBe(4);
  });
  it("preserves list filters but rejects unrelated return paths", () => {
    expect(branchReturn("/branches?q=centro&vista=bloques&volverA=fila-1")).toBe(
      "/branches?q=centro&vista=bloques",
    );
    for (const path of [
      "https://example.com/branches",
      "//example.com/branches",
      "/branches/new",
      "/branches/../account",
    ])
      expect(branchReturn(path)).toBe("/branches");
  });
});
