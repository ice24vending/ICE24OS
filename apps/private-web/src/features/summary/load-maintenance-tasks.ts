import { maintenancePageSchema, workOrderPageSchema } from "@ice24/contracts";
import { maintenanceTasks } from "./maintenance-tasks";
import { readSummaryList, type SummaryCall } from "./load-operational-summary";

export async function loadMaintenanceTasks(
  call: SummaryCall,
  options: {
    filters: URLSearchParams;
    readOrders: boolean;
    technicianId: string | undefined;
  },
) {
  const orderFilters = new URLSearchParams(options.filters);
  orderFilters.delete("branchId");
  if (options.technicianId) orderFilters.set("assigneeId", options.technicianId);
  const [orders, activities] = await Promise.all([
    options.readOrders
      ? readSummaryList(call, "work-orders", (v) => workOrderPageSchema.parse(v), orderFilters)
      : { data: [] },
    !options.technicianId
      ? readSummaryList(
          call,
          "maintenance/activities",
          (v) => maintenancePageSchema.parse(v),
          options.filters,
        )
      : { data: [] },
  ]);
  if (orders.data === null || activities.data === null) throw new Error("tasks unavailable");
  const branch = options.filters.get("branchId");
  return maintenanceTasks(
    orders.data.filter((o) => !branch || o.branchId === branch),
    activities.data,
    options.technicianId,
  );
}
