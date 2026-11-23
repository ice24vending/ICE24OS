import type { MachineOverview } from "@ice24/contracts";
import type { TableSort } from "@ice24/ui";

export const OPERATION = {
  available: { label: "Disponible", tone: "success" },
  off: { label: "Apagada", tone: "nodata" },
  maintenance: { label: "En mantenimiento", tone: "warning" },
  out_of_service: { label: "Fuera de servicio", tone: "danger" },
  suspended: { label: "Suspendida", tone: "warning" },
  retired: { label: "Retirada", tone: "nodata" },
} as const;
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export function machineRows(
  rows: readonly MachineOverview[],
  query: string,
  branch: string,
  state: string,
  sort: TableSort,
) {
  const value = (row: MachineOverview): string | number | null => {
    switch (sort.columnId) {
      case "name":
        return row.name;
      case "branch":
        return row.branchName;
      case "status":
        return OPERATION[row.operational_status].label;
      case "last":
        return row.lastMaintenanceAt;
      case "next":
        return row.nextMaintenanceAt;
      case "tickets":
        return row.openTickets;
      default:
        return row.machine_code;
    }
  };
  return rows
    .filter(
      (row) =>
        (!branch || row.branch_id === branch) &&
        (!state || row.operational_status === state) &&
        fold([row.name, row.machine_code, row.serialNumber].join(" ")).includes(fold(query.trim())),
    )
    .sort((a, b) => {
      const av = value(a),
        bv = value(b);
      // Missing dates always go last; do not imply that an unrecorded visit happened first.
      if (av === null && bv !== null) return 1;
      if (bv === null && av !== null) return -1;
      const comparison =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""), "es-MX", { numeric: true });
      return comparison * (sort.direction === "descending" ? -1 : 1) || a.id.localeCompare(b.id);
    });
}
export function maintenanceDate(value: string | null, empty: string) {
  return value
    ? new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "America/Mexico_City",
      }).format(new Date(value))
    : empty;
}
