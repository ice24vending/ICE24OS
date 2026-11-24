import {
  ticketPageSchema,
  ticketDetailSchema,
  ticketQuerySchema,
  ticketDiagnosisSchema,
  ticketSchema,
  type Ticket,
  type TicketDetail,
} from "@ice24/contracts";
import { operationTickets } from "./summary-fixtures";
import type { DemoRequest } from "./api";
import { demoIds, demoUserId } from "./fixtures";
export const demoTicketOptions = {
  systems: [{ id: demoIds.catalog(2), name: "Refrigeración" }],
  components: [{ id: demoIds.catalog(3), name: "Compresor" }],
};
const zone = "America/Mexico_City";
const day = (value: string | number) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
const open = (ticket: Ticket) => ["pending_assignment", "in_progress"].includes(ticket.state);
const scenarios = [
  {
    system: "Refrigeración",
    component: "Compresor",
    priority: "high",
    state: "pending_assignment",
    description:
      "La producción de hielo bajó durante el turno de apertura. El compresor vibra al arrancar y el gabinete se siente más caliente de lo habitual.",
    diagnosis:
      "Revisar la ventilación y medir la temperatura del condensador antes de volver a operar.",
    age: 26,
    order: null,
  },
  {
    system: "Eléctrico",
    component: "Tablero de control",
    priority: "critical",
    state: "in_progress",
    description:
      "La máquina se apagó después de una variación de voltaje. El interruptor vuelve a dispararse al intentar encenderla.",
    diagnosis: "Equipo aislado. Se revisan protecciones y conexiones del tablero.",
    age: 48,
    order: 3,
  },
  {
    system: "Despacho",
    component: "Compuerta",
    priority: "low",
    state: "pending_assignment",
    description:
      "La compuerta tarda unos segundos en cerrar. El despacho se completa, pero se escucha un roce al terminar.",
    diagnosis: null,
    age: 6,
    order: null,
  },
  {
    system: "Agua",
    component: "Filtro de entrada",
    priority: "normal",
    state: "completed",
    description: "El caudal de entrada disminuyó y el depósito tardaba demasiado en llenarse.",
    diagnosis: "Filtro sustituido y caudal verificado durante tres ciclos completos.",
    age: 72,
    order: 4,
  },
  {
    system: "Cobro",
    component: "Lector de monedas",
    priority: "normal",
    state: "cancelled",
    description:
      "Se reportó rechazo de monedas. La revisión confirmó que era un reporte duplicado del turno anterior.",
    diagnosis: "Seguimiento concentrado en el reporte original; no requiere otra visita.",
    age: 120,
    order: null,
  },
  {
    system: "Refrigeración",
    component: "Ventilador",
    priority: "high",
    state: "pending_assignment",
    description: "El ventilador del condensador se detiene de forma intermitente por las tardes.",
    diagnosis: "Se programó revisión del motor y limpieza del condensador.",
    age: 30,
    order: 0,
  },
  {
    system: "Sensores",
    component: "Sensor de nivel",
    priority: "normal",
    state: "in_progress",
    description:
      "El indicador marca depósito vacío aunque contiene hielo. La falla se presenta después de cada limpieza.",
    diagnosis: "Se revisan el sensor y la continuidad del cableado.",
    age: 15,
    order: 3,
  },
  {
    system: "Despacho",
    component: "Motor dosificador",
    priority: "critical",
    state: "completed",
    description:
      "El motor dosificador dejó de girar y bloqueó el servicio durante el turno nocturno.",
    diagnosis: "Obstrucción retirada; se verificaron cinco despachos sin interrupciones.",
    age: 96,
    order: 4,
  },
] as const;
export function demoTickets(request: DemoRequest): Ticket[] {
  const offset = request.state.account === "bajio" ? 100 : 0;
  const base =
    request.state.maintenance === "operation"
      ? operationTickets(request)
      : request.machines.map((machine): Ticket => {
          const index = request.account.machines.indexOf(machine);
          const scenario = scenarios[index % scenarios.length]!;
          return {
            id: demoIds.request(900 + index + offset),
            folio: "TKT-" + String(index + 1).padStart(6, "0"),
            machineId: machine.id,
            machineCode: machine.code,
            systemId: demoIds.catalog(index === 0 ? 2 : 20 + index),
            systemName: scenario.system,
            componentId: demoIds.catalog(index === 0 ? 3 : 40 + index),
            componentName: scenario.component,
            priority: scenario.priority,
            description: scenario.description,
            diagnosis: scenario.diagnosis,
            state: scenario.state,
            activityId: null,
            workOrderId:
              scenario.order === null
                ? null
                : demoIds.job(2000 + index * 10 + scenario.order + offset * 10),
            evidenceIds: index === 0 ? [demoIds.job(960), demoIds.job(961)] : [],
            rowVersion: 2,
            createdAt: new Date(request.now - scenario.age * 3600000).toISOString(),
          };
        });
  return base
    .map((ticket, index) => {
      const machine = request.account.machines.find((item) => item.id === ticket.machineId)!;
      const orderNumber = ticket.workOrderId
        ? parseInt(ticket.workOrderId.slice(-12), 16) - 2000 - offset * 10 + 1
        : null;
      return {
        ...ticket,
        branchId: machine.branchId,
        branchName: request.account.branches.find((branch) => branch.id === machine.branchId)!.name,
        reportedBy: {
          id: demoUserId(index % 2 ? "admin" : "owner"),
          name: index % 2 ? "Jorge Salinas" : "Laura Méndez",
        },
        assignedTo: ticket.workOrderId
          ? { id: demoUserId("technician"), name: "Ana Torres" }
          : null,
        workOrderFolio: orderNumber === null ? null : "OT-" + String(orderNumber).padStart(6, "0"),
        resolvedAt:
          ticket.state === "completed"
            ? new Date(request.now - (index % 2 ? 1 : 27) * 3600000).toISOString()
            : null,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
export function demoTicketsResponse(
  request: DemoRequest,
  route: string,
  params: URLSearchParams,
  init: RequestInit = {},
): Response {
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "cache-control": "no-store" } });
  const error = (status: number, code: string, message: string) =>
    json(
      {
        error: {
          code,
          message,
          correlationId: demoIds.correlation(99),
          timestamp: new Date(request.now).toISOString(),
        },
      },
      status,
    );
  if (!request.can("maintenance.tickets-read")) return error(403, "FORBIDDEN", "Sin permiso");
  if (route.startsWith("tickets/options/"))
    return request.machines.some((m) => m.id === route.split("/")[2])
      ? json(demoTicketOptions)
      : error(404, "NOT_FOUND", "Máquina no disponible");
  const parsed = ticketQuerySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) return error(400, "VALIDATION_FAILED", "Filtros inválidos");
  const query = parsed.data;
  const all = demoTickets(request);
  const rows = request.state.maintenance === "empty" ? [] : all;
  const resolvedToday = (ticket: Ticket) =>
    ticket.state === "completed" &&
    !!ticket.resolvedAt &&
    day(ticket.resolvedAt) === day(request.now);
  if (route === "tickets") {
    const filtered = rows.filter(
      (ticket) =>
        (!query.machineId || ticket.machineId === query.machineId) &&
        (!query.branchId || ticket.branchId === query.branchId) &&
        (!query.state || ticket.state === query.state) &&
        (!query.priority || ticket.priority === query.priority) &&
        (!query.from || day(ticket.createdAt) >= query.from) &&
        (!query.to || day(ticket.createdAt) <= query.to) &&
        (!query.metric ||
          (query.metric === "open" && open(ticket)) ||
          (query.metric === "unassigned" && open(ticket) && !ticket.workOrderId) ||
          (query.metric === "highPriority" &&
            open(ticket) &&
            ["high", "critical"].includes(ticket.priority)) ||
          (query.metric === "resolvedToday" && resolvedToday(ticket))),
    );
    const recent = query.sort === "recent";
    const point = recent ? query.cursor?.split("|") : undefined;
    const page = filtered
      .filter((ticket) => {
        if (!query.cursor) return true;
        if (!recent) return ticket.id > query.cursor;
        const cursorTime = Date.parse(point![0]!);
        const reportedAt = Date.parse(ticket.createdAt);
        return reportedAt < cursorTime || (reportedAt === cursorTime && ticket.id < point![1]!);
      })
      .sort((a, b) =>
        recent
          ? b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)
          : a.id.localeCompare(b.id),
      );
    const items = page.slice(0, query.limit);
    const last = items.at(-1);
    return json(
      ticketPageSchema.parse({
        items,
        nextCursor:
          page.length > query.limit && last
            ? recent
              ? `${last.createdAt.replace(/Z$/, "000Z")}|${last.id}`
              : last.id
            : null,
        total: filtered.length,
        summary: {
          open: rows.filter(open).length,
          unassigned: rows.filter((t) => open(t) && !t.workOrderId).length,
          highPriority: rows.filter((t) => open(t) && ["high", "critical"].includes(t.priority))
            .length,
          resolvedToday: rows.filter(resolvedToday).length,
          timeZone: zone,
          asOf: new Date(request.now).toISOString(),
        },
        filters: {
          branches: [
            ...new Map(
              rows.map((t) => [t.branchId, { id: t.branchId, name: t.branchName }]),
            ).values(),
          ],
          machines: [
            ...new Map(
              rows.map((t) => [
                t.machineId,
                { id: t.machineId, name: t.machineCode, branchId: t.branchId },
              ]),
            ).values(),
          ],
        },
      }),
    );
  }
  const ticket = all.find((t) => t.id === route.split("/")[1]);
  if (!ticket) return error(404, "NOT_FOUND", "Ticket no disponible");
  if ((init.method ?? "GET") !== "GET") {
    const decision = request.authorize("maintenance.tickets-edit", "WRITE", {
      machineId: ticket.machineId,
      branchId: ticket.branchId!,
    });
    if (!decision.allowed)
      return error(
        403,
        decision.reason === "account_read_only" ? "ACCOUNT_READ_ONLY" : "FORBIDDEN",
        "Sin permiso de edición",
      );
    let input: unknown;
    try {
      input = JSON.parse(String(init.body));
    } catch {
      return error(400, "VALIDATION_FAILED", "Datos inválidos");
    }
    const diagnosis = ticketDiagnosisSchema.safeParse(input);
    const headers = new Headers(init.headers);
    if (!diagnosis.success || !headers.get("idempotency-key"))
      return error(400, "VALIDATION_FAILED", "Revisa los datos");
    if (
      headers.get("if-match")?.replace(/^W\//, "").replaceAll('"', "") !==
        String(ticket.rowVersion) ||
      ticket.workOrderId ||
      ticket.state !== "pending_assignment"
    )
      return error(409, "CONFLICT", "El ticket cambió");
    return json(
      ticketSchema.parse({
        ...ticket,
        diagnosis: diagnosis.data.diagnosis,
        rowVersion: ticket.rowVersion + 1,
      }),
      201,
    );
  }
  const empty = request.state.maintenance === "empty";
  const events: TicketDetail["events"] = [
    {
      id: demoIds.audit(900),
      operation: "TicketCreated",
      occurredAt: ticket.createdAt,
      reason: "Reporte inicial",
      diagnosis: null,
      actorName: ticket.reportedBy?.name,
    },
  ];
  if (ticket.diagnosis)
    events.push({
      id: demoIds.audit(901),
      operation: "TicketDiagnosed",
      occurredAt: new Date(Date.parse(ticket.createdAt) + 1800000).toISOString(),
      reason: "Inspección inicial",
      diagnosis: ticket.diagnosis,
      actorName: "Ana Torres",
    });
  if (ticket.workOrderId)
    events.push({
      id: demoIds.audit(902),
      operation: "TicketAssigned",
      occurredAt: new Date(Date.parse(ticket.createdAt) + 3600000).toISOString(),
      reason: "Visita técnica programada",
      diagnosis: null,
      actorName: "Jorge Salinas",
    });
  if (ticket.state === "in_progress")
    events.push({
      id: demoIds.audit(903),
      operation: "TicketWorkOrderStarted",
      occurredAt: new Date(Date.parse(ticket.createdAt) + 7200000).toISOString(),
      reason: "Revisión en sitio",
      diagnosis: null,
      actorName: "Ana Torres",
    });
  if (ticket.resolvedAt)
    events.push({
      id: demoIds.audit(904),
      operation: "TicketCompleted",
      occurredAt: ticket.resolvedAt,
      reason: "Funcionamiento verificado",
      diagnosis: null,
      actorName: "Ana Torres",
    });
  return json(
    ticketDetailSchema.parse({
      ticket: empty ? { ...ticket, evidenceIds: [], diagnosis: null } : ticket,
      events: empty ? [] : events,
      timeZone: zone,
    }),
  );
}
