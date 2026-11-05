import type { MaintenanceState } from "@ice24/contracts";
import type { StatusTone } from "@ice24/ui";
export const MAINTENANCE_LABELS: Record<MaintenanceState, string> = {
  scheduled: "Programada",
  upcoming: "Próxima",
  overdue: "Vencida",
  critical: "Crítica",
  in_progress: "En atención",
  completed: "Completada",
  cancelled: "Cancelada",
};
export function maintenanceTone(state: MaintenanceState): StatusTone {
  if (state === "critical") return "danger";
  if (state === "overdue" || state === "upcoming") return "warning";
  if (state === "completed") return "success";
  if (state === "cancelled") return "nodata";
  return "info";
}
export const assignableActivity = (state: MaintenanceState) =>
  ["scheduled", "upcoming", "overdue", "critical"].includes(state);
