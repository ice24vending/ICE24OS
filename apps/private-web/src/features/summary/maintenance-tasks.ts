import type { ScheduledActivity, WorkOrder } from "@ice24/contracts";
export interface MaintenanceTask {
  id: string;
  label: string;
  machine: string;
  href: string;
  state: string;
  dueAt: string | null;
}
const urgency: Record<string, number> = {
  critical: 0,
  overdue: 1,
  nonconforming: 2,
  with_observations: 3,
  in_progress: 4,
  upcoming: 5,
  scheduled: 6,
};
export function maintenanceTasks(
  orders: readonly WorkOrder[],
  activities: readonly ScheduledActivity[],
  technicianId?: string,
): MaintenanceTask[] {
  const tasks: MaintenanceTask[] = orders
    .filter(
      (order) => order.state in urgency && (!technicianId || order.assigneeId === technicianId),
    )
    .map((order) => ({
      id: order.id,
      label: order.folio + " · " + order.definition.name,
      machine: order.machineCode,
      href: `/maintenance/work-orders/${order.id}`,
      state: order.state,
      dueAt: order.dueAt,
    }));
  const linked = new Set(orders.map((order) => order.activityId).filter(Boolean));
  if (!technicianId)
    tasks.push(
      ...activities
        .filter((item) => item.state in urgency && !linked.has(item.id))
        .map((item) => ({
          id: item.id,
          label: item.name,
          machine: item.machineCode,
          href: `/maintenance?view=list&machineId=${item.machineId}&state=${item.state}`,
          state: item.state,
          dueAt: item.dueAt,
        })),
    );
  return tasks
    .sort(
      (a, b) =>
        urgency[a.state]! - urgency[b.state]! ||
        (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 5);
}
