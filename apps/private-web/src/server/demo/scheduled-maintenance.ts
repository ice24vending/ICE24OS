import {
  maintenanceQuerySchema,
  maintenancePageSchema,
  maintenanceSummarySchema,
  type ScheduledActivity,
} from "@ice24/contracts";
import type { DemoRequest } from "./api";
import { demoIds } from "./fixtures";

export function demoMaintenanceResponse(
  request: DemoRequest,
  route: string,
  params: URLSearchParams,
): Response {
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "cache-control": "no-store" } });
  if (
    !request.can("maintenance.read") ||
    (request.state.persona === "technician" && request.state.maintenance === "revoked")
  )
    return json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Sin permiso",
          correlationId: demoIds.correlation(999),
          timestamp: new Date(request.now).toISOString(),
        },
      },
      403,
    );
  const parsed = maintenanceQuerySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) return json({ message: "Filtros inválidos" }, 400);
  const query = parsed.data;
  const states = [
    "upcoming",
    "overdue",
    "critical",
    "completed",
    "scheduled",
    "in_progress",
  ] as const;
  let rows: ScheduledActivity[] = request.machines
    .filter((m) =>
      request.can(
        "maintenance.read",
        request.subject.machineIds.has(m.id) ? { machineId: m.id } : { branchId: m.branchId },
      ),
    )
    .flatMap((m, index) =>
      states.map((state, n) => ({
        id: demoIds.job(500 + index * 10 + n),
        machineId: m.id,
        branchId: m.branchId,
        machineCode: m.code,
        machineName: m.name,
        branchName: request.account.branches.find((b) => b.id === m.branchId)!.name,
        activityCode: `MNT-${n + 1}`,
        name: n % 2 ? "Limpiar condensador" : "Revisar filtro de agua",
        state,
        dueAt: new Date(request.now + [2, -2, -8, -1, 20, 0][n]! * 86400000).toISOString(),
        alertAt: new Date(request.now + ([2, -2, -8, -1, 20, 0][n]! - 7) * 86400000).toISOString(),
        timezone: "America/Mexico_City",
        assigneeId: null,
        rowVersion: 1,
      })),
    );
  if (request.state.maintenance === "empty") rows = [];
  rows = rows.filter(
    (row) =>
      (!query.machineId || row.machineId === query.machineId) &&
      (!query.branchId || row.branchId === query.branchId) &&
      (!request.state.focus?.machineId || row.machineId === request.state.focus.machineId) &&
      (!request.state.focus?.branchId || row.branchId === request.state.focus.branchId) &&
      (!query.assigneeId || query.assigneeId === "unassigned"),
  );
  if (route === "maintenance/summary")
    return json(
      maintenanceSummarySchema.parse({
        upcoming: rows.filter((row) => row.state === "upcoming").length,
        asOf: new Date(request.now).toISOString(),
      }),
    );
  rows = rows
    .filter(
      (row) =>
        (!query.state || row.state === query.state) &&
        (!query.period || row.state === "upcoming") &&
        (!query.cursor || row.id > query.cursor),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const items = rows.slice(0, query.limit);
  return json(
    maintenancePageSchema.parse({
      items,
      nextCursor: rows.length > query.limit ? items.at(-1)!.id : null,
    }),
  );
}
