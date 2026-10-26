import { describe, expect, it } from "vitest";

import { toSummaryMachines } from "./machines";

describe("toSummaryMachines", () => {
  const branches = [{ id: "b1", name: "Centro Monterrey" }];

  it("joins each machine with its branch name and fills missing labels", () => {
    expect(
      toSummaryMachines(
        [
          {
            id: "m1",
            status: "available",
            name: "Despachadora",
            machine_code: "ICE24-0001",
            branch_id: "b1",
          },
          { id: "m2", status: "off", name: null, machine_code: null, branch_id: "b9" },
        ],
        branches,
      ),
    ).toEqual([
      {
        id: "m1",
        status: "available",
        code: "ICE24-0001",
        name: "Despachadora",
        branch: "Centro Monterrey",
      },
      { id: "m2", status: "off", code: "—", name: "Sin nombre", branch: "Sin sucursal" },
    ]);
  });

  it("rejects the whole answer when a row is malformed or the body is not a list", () => {
    expect(toSummaryMachines([{ id: "m1" }], branches)).toBeNull();
    expect(toSummaryMachines({ items: [] }, branches)).toBeNull();
    expect(toSummaryMachines([], null)).toBeNull();
  });

  it("returns an empty list for an account without machines", () => {
    expect(toSummaryMachines([], [])).toEqual([]);
  });
});
