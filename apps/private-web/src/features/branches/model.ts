import type { BranchOverview } from "@ice24/contracts";
import type { TableSort } from "@ice24/ui";

export const OPERATION: Record<
  string,
  { label: string; tone: "success" | "nodata" | "warning" | "danger" }
> = {
  available: { label: "Disponibles", tone: "success" },
  off: { label: "Apagadas", tone: "nodata" },
  maintenance: { label: "En mantenimiento", tone: "warning" },
  out_of_service: { label: "Fuera de servicio", tone: "danger" },
  suspended: { label: "Suspendidas", tone: "warning" },
};
export const machineTotal = (row: BranchOverview) =>
  Object.values(row.machineCounts).reduce((sum, count) => sum + count, 0);
export const address = (row: BranchOverview) =>
  [row.data.address, row.data.city, row.data.state].filter(Boolean).join(", ");
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export function branchRows(rows: BranchOverview[], query: string, state: string, sort: TableSort) {
  const value = (row: BranchOverview): string | number => {
    switch (sort.columnId) {
      case "code":
        return row.data.code ?? "";
      case "address":
        return address(row);
      case "machines":
        return machineTotal(row);
      case "responsible":
        return row.responsible;
      case "status":
        return row.status;
      default:
        return row.data.name;
    }
  };
  return rows
    .filter(
      (row) =>
        (!state || row.status === state) &&
        fold([row.data.name, row.data.code, address(row), row.responsible].join(" ")).includes(
          fold(query.trim()),
        ),
    )
    .sort(
      (a, b) =>
        (typeof value(a) === "number"
          ? Number(value(a)) - Number(value(b))
          : String(value(a)).localeCompare(String(value(b)), "es-MX", { numeric: true })) *
        (sort.direction === "descending" ? -1 : 1),
    );
}
/** Return only to this list, never to an arbitrary URL supplied by a visitor. */
export function branchReturn(value: string | null): string {
  if (!value?.startsWith("/branches")) return "/branches";
  const url = new URL(value, "https://ice24.invalid");
  if (url.pathname !== "/branches" || url.origin !== "https://ice24.invalid") return "/branches";
  url.searchParams.delete("volverA");
  return url.pathname + url.search;
}
