import { maintenancePageSchema, workOrderPageSchema } from "@ice24/contracts";
import { maintenanceTasks } from "./maintenance-tasks";

type Call = (path: string) => Promise<Response | null>;
interface Options {
  filters: URLSearchParams;
  readOrders: boolean;
  technicianId: string | undefined;
}
async function pages<T>(
  call: Call,
  path: string,
  filters: URLSearchParams,
  state: string,
  parse: (value: unknown) => { items: T[]; nextCursor: string | null },
): Promise<T[]> {
  const items: T[] = [];
  const params = new URLSearchParams(filters);
  params.set("state", state);
  params.set("limit", "100");
  // shortcut: 3 pages × 100 per active state (18 order / 15 activity requests maximum).
  // Replace with a scoped urgency-sorted API top-five query when larger accounts need exact ranking.
  for (let index = 0; index < 3; index++) {
    const response = await call(`${path}?${params}`);
    if (!response?.ok) throw new Error("tasks unavailable");
    const page = parse(await response.json());
    items.push(...page.items);
    if (!page.nextCursor) break;
    params.set("cursor", page.nextCursor);
  }
  return items;
}
export async function loadMaintenanceTasks(call: Call, options: Options) {
  const orderFilters = new URLSearchParams(options.filters);
  orderFilters.delete("branchId");
  if (options.technicianId) orderFilters.set("assigneeId", options.technicianId);
  const [orderPages, activityPages] = await Promise.all([
    options.readOrders
      ? Promise.all(
          [
            "overdue",
            "nonconforming",
            "with_observations",
            "in_progress",
            "upcoming",
            "scheduled",
          ].map((state) =>
            pages(call, "work-orders", orderFilters, state, (value) =>
              workOrderPageSchema.parse(value),
            ),
          ),
        )
      : [],
    !options.technicianId
      ? Promise.all(
          ["critical", "overdue", "in_progress", "upcoming", "scheduled"].map((state) =>
            pages(call, "maintenance/activities", options.filters, state, (value) =>
              maintenancePageSchema.parse(value),
            ),
          ),
        )
      : [],
  ]);
  const branchId = options.filters.get("branchId");
  return maintenanceTasks(
    orderPages.flat().filter((item) => !branchId || item.branchId === branchId),
    activityPages.flat(),
    options.technicianId,
  );
}
