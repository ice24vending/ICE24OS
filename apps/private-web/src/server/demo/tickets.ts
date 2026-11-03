import {
  ticketPageSchema,
  ticketDetailSchema,
  ticketQuerySchema,
  type Ticket,
} from "@ice24/contracts";
import type { DemoRequest } from "./api";
import { demoIds } from "./fixtures";
export const demoTicketOptions = {
  systems: [{ id: demoIds.catalog(2), name: "Refrigeración" }],
  components: [{ id: demoIds.catalog(3), name: "Compresor" }],
};
export function demoTicketsResponse(
  request: DemoRequest,
  route: string,
  params: URLSearchParams,
): Response {
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "cache-control": "no-store" } });
  if (!request.can("maintenance.tickets-read"))
    return json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Sin permiso",
          correlationId: demoIds.correlation(99),
          timestamp: new Date(request.now).toISOString(),
        },
      },
      403,
    );
  if (route.startsWith("tickets/options/"))
    return request.machines.some((m) => m.id === route.split("/")[2])
      ? json(demoTicketOptions)
      : json({}, 404);
  const parsed = ticketQuerySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) return json({}, 400);
  const query = parsed.data;
  const tickets: Ticket[] = request.machines.map((m) => ({
    id: demoIds.request(
      900 + request.account.machines.indexOf(m) + (request.state.account === "bajio" ? 100 : 0),
    ),
    folio: `TKT-${String(request.account.machines.indexOf(m) + 1).padStart(6, "0")}`,
    machineId: m.id,
    machineCode: m.code,
    systemId: demoIds.catalog(2),
    systemName: "Refrigeración",
    componentId: demoIds.catalog(3),
    componentName: "Compresor",
    priority: "high",
    description: "La máquina produce menos hielo y presenta ruido al arrancar.",
    diagnosis: "Revisar ventilación y temperatura del condensador.",
    state: "pending_assignment",
    activityId: null,
    workOrderId: null,
    evidenceIds: [],
    rowVersion: 2,
    createdAt: "2026-11-02T16:00:00.000Z",
  }));
  if (route === "tickets") {
    const rows =
      request.state.maintenance === "empty"
        ? []
        : tickets.filter(
            (t) =>
              (!query.machineId || t.machineId === query.machineId) &&
              (!query.cursor || t.id > query.cursor),
          );
    const items = rows.slice(0, query.limit);
    return json(
      ticketPageSchema.parse({
        items,
        nextCursor: rows.length > query.limit ? items.at(-1)!.id : null,
      }),
    );
  }
  const ticket = tickets.find((t) => t.id === route.split("/")[1]);
  if (!ticket) return json({}, 404);
  return json(
    ticketDetailSchema.parse({
      ticket,
      events: [
        {
          id: demoIds.audit(900),
          operation: "TicketCreated",
          occurredAt: ticket.createdAt,
          reason: "Reporte inicial",
          diagnosis: null,
        },
        {
          id: demoIds.audit(901),
          operation: "TicketDiagnosed",
          occurredAt: "2026-11-02T16:30:00.000Z",
          reason: "Inspección inicial",
          diagnosis: ticket.diagnosis,
        },
      ],
    }),
  );
}
