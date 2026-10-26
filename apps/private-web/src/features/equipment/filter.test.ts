import { describe, expect, it } from "vitest";
import { filterRows } from "./workspace";

type Rows = Parameters<typeof filterRows>[0];
const rows = [
  { id: "1", row_version: 1, name: "Máquina Centro", machine_code: "ICE-0001" },
  {
    id: "2",
    row_version: 1,
    name: "Norte",
    machine_code: "ICE-0002",
    data: { serialNumber: "SN-77" },
  },
  { id: "3", row_version: 1, folio: "SOL-9" },
] as Rows;
const ids = (text: string) => filterRows(rows, text).map((row) => row.id);

describe("list filter (F6-D03)", () => {
  it("matches name, code, serial and folio ignoring case and accents", () => {
    expect(ids("maquina")).toEqual(["1"]);
    expect(ids("ice-0002")).toEqual(["2"]);
    expect(ids("sn-77")).toEqual(["2"]);
    expect(ids("sol")).toEqual(["3"]);
  });

  it("returns every row for an empty or blank text and none when nothing matches", () => {
    expect(ids("  ")).toEqual(["1", "2", "3"]);
    expect(ids("xyz")).toEqual([]);
  });
});
