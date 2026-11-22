import {
  apiErrorSchema,
  maintenancePageSchema,
  notificationPageSchema,
  ticketPageSchema,
  workOrderPageSchema,
  type Notification,
  type Ticket,
  type ScheduledActivity,
  type WorkOrder,
} from "@ice24/contracts";
import { toSummaryMachines, type SummaryMachine } from "./machines";
import { maintenanceTasks } from "./maintenance-tasks";

export type SummaryCall = (path: string) => Promise<Response | null>;
export interface SummarySource<T> {
  data: T | null;
  denied: boolean;
  correlationId?: string | undefined;
}
const missing = <T>(): SummarySource<T> => ({ data: null, denied: false });

/** A complete list or no data. Never publish the first pages as an account total. */
export async function readSummaryList<T>(
  call: SummaryCall,
  path: string,
  parse: (body: unknown) => { items: T[]; nextCursor: string | null },
  filters = new URLSearchParams(),
): Promise<SummarySource<T[]>> {
  const params = new URLSearchParams(filters);
  params.set("limit", "100");
  const items: T[] = [];
  const cursors = new Set<string>();
  // shortcut: tope de 500 registros por lista; crear endpoint de agregados si una cuenta real lo alcanza
  try {
    for (let index = 0; index < 5; index++) {
      const response = await call(`${path}?${params}`);
      if (!response) return missing();
      if (!response.ok) {
        const error = apiErrorSchema.safeParse(await response.json().catch(() => null));
        return {
          data: null,
          denied: response.status === 403,
          correlationId: error.success ? error.data.error.correlationId : undefined,
        };
      }
      const page = parse(await response.json());
      items.push(...page.items);
      if (items.length > 500) return missing();
      if (!page.nextCursor) return { data: items, denied: false };
      if (cursors.has(page.nextCursor)) return missing();
      cursors.add(page.nextCursor);
      params.set("cursor", page.nextCursor);
    }
  } catch {
    /* A failed page invalidates the entire list. */
  }
  return missing();
}

const arrayPage = (body: unknown) => {
  if (
    !Array.isArray(body) ||
    !body.every((row) => row !== null && typeof row === "object" && typeof row.id === "string")
  )
    throw new Error("Invalid list");
  return { items: body as Record<string, unknown>[], nextCursor: null };
};
export const parseSummaryAlerts = (body: unknown) => {
  const page = notificationPageSchema.parse(body);
  return { items: page.items, nextCursor: page.page.nextCursor };
};
export function unacknowledgedAlerts(items: readonly Notification[]) {
  return items.filter(
    (n) =>
      (n.priority === "high" || n.priority === "critical") &&
      n.acknowledgedAt === null &&
      n.status !== "resolved",
  ).length;
}
export const summaryDay = (value: string | number) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export const activeOrder = (order: WorkOrder) =>
  !["completed", "cancelled", "corrected"].includes(order.state);

export function operationalCounts(
  machines: readonly SummaryMachine[] | null,
  tickets: readonly Ticket[] | null,
  activities: readonly ScheduledActivity[] | null,
  orders: readonly WorkOrder[] | null,
  now: number,
) {
  const today = tickets?.filter((t) => summaryDay(t.createdAt) === summaryDay(now)) ?? null;
  const next =
    activities?.filter(
      (a) =>
        ["upcoming", "scheduled"].includes(a.state) &&
        a.dueAt &&
        Date.parse(a.dueAt) > now &&
        Date.parse(a.dueAt) <= now + 7 * 86400000,
    ) ?? null;
  const overdue =
    activities?.filter((a) => a.state === "overdue" || a.state === "critical") ?? null;
  const assignees = new Map<string, { label: string; value: number }>();
  orders?.filter(activeOrder).forEach((order) => {
    const row = assignees.get(order.assigneeId) ?? { label: order.assigneeName, value: 0 };
    row.value++;
    assignees.set(order.assigneeId, row);
  });
  return {
    available: machines?.filter((m) => m.status === "available").length ?? null,
    today,
    openToday:
      today?.filter((t) => ["pending_assignment", "in_progress"].includes(t.state)).length ?? null,
    next,
    overdue,
    assignees: orders
      ? [...assignees.values()]
          .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "es-MX"))
          .slice(0, 5)
      : null,
    activeOrders: orders?.filter(activeOrder).length ?? null,
  };
}

export async function loadOperationalSummary(
  call: SummaryCall,
  options: {
    permissions: readonly string[] | null;
    branchId?: string | null | undefined;
    machineId?: string | null | undefined;
    technicianId?: string | undefined;
  },
) {
  const now = Date.now();
  const can = (permission: string) => options.permissions?.includes(permission) ?? false;
  const filters = new URLSearchParams();
  if (options.machineId) filters.set("machineId", options.machineId);
  const activityFilters = new URLSearchParams(filters);
  if (options.branchId) activityFilters.set("branchId", options.branchId);
  const orderFilters = new URLSearchParams(filters);
  if (options.technicianId) orderFilters.set("assigneeId", options.technicianId);
  const skipped = <T>(): SummarySource<T[]> => ({
    data: null,
    denied: options.permissions !== null,
  });
  const [machineRows, branches, alerts, tickets, activities, orders] = await Promise.all([
    readSummaryList(call, "machines", arrayPage),
    readSummaryList(call, "branches", arrayPage),
    can("notifications.read")
      ? readSummaryList(call, "notifications", parseSummaryAlerts)
      : skipped<Notification>(),
    can("maintenance.tickets-read")
      ? readSummaryList(call, "tickets", (v) => ticketPageSchema.parse(v), filters)
      : skipped<Ticket>(),
    can("maintenance.read")
      ? readSummaryList(
          call,
          "maintenance/activities",
          (v) => maintenancePageSchema.parse(v),
          activityFilters,
        )
      : skipped<ScheduledActivity>(),
    can("maintenance.orders-read")
      ? readSummaryList(call, "work-orders", (v) => workOrderPageSchema.parse(v), orderFilters)
      : skipped<WorkOrder>(),
  ]);
  const inFocus = (row: Record<string, unknown>) =>
    (!options.machineId || row.id === options.machineId) &&
    (!options.branchId || row.branch_id === options.branchId);
  const scopedMachines = machineRows.data?.filter(inFocus) ?? null;
  const machineIds = new Set(scopedMachines?.map((m) => m.id));
  if (tickets.data && (options.branchId || options.machineId))
    tickets.data = scopedMachines ? tickets.data.filter((t) => machineIds.has(t.machineId)) : null;
  if (orders.data && options.branchId)
    orders.data = orders.data.filter((o) => o.branchId === options.branchId);
  const machines = toSummaryMachines(scopedMachines, branches.data);
  const tasks =
    activities.data !== null && (orders.data !== null || orders.denied)
      ? maintenanceTasks(
          orders.data ?? [],
          activities.data,
          options.technicianId,
          branches.data ?? [],
        )
      : null;
  return {
    now,
    machines,
    machineSource: machineRows,
    branchSource: branches,
    alerts,
    tickets,
    activities,
    orders,
    tasks,
  };
}
