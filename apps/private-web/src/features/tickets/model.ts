import { ticketDetailSchema, ticketSchema, type Ticket } from "@ice24/contracts";
export const ticketDetailViewSchema = ticketDetailSchema.extend({
  originOrder: ticketSchema.pick({ id: true, folio: true }).optional(),
});

export const TICKET_STATES = {
  pending_assignment: { label: "Pendiente de asignación", tone: "warning" },
  in_progress: { label: "En atención", tone: "info" },
  completed: { label: "Resuelto", tone: "success" },
  cancelled: { label: "Cancelado", tone: "nodata" },
} as const;
export const PRIORITIES = {
  low: { label: "Baja", tone: "nodata" },
  normal: { label: "Normal", tone: "info" },
  high: { label: "Alta", tone: "warning" },
  critical: { label: "Crítica", tone: "danger" },
} as const;
export const METRICS = {
  open: "Abiertos",
  unassigned: "Sin asignar",
  highPriority: "Alta prioridad",
  resolvedToday: "Resueltos hoy",
} as const;
export const FILTER_KEYS = [
  "state",
  "priority",
  "branchId",
  "machineId",
  "from",
  "to",
  "metric",
] as const;
export const LIST_PATH = "/maintenance/tickets";
export const listHref = (query: URLSearchParams) => `${LIST_PATH}${query.size ? `?${query}` : ""}`;
export function ticketQuery(params: URLSearchParams) {
  const query = new URLSearchParams();
  for (const key of [...FILTER_KEYS, "sort", "cursor", "limit"]) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  return query;
}
export function changeFilters(params: URLSearchParams, values: Record<string, string>) {
  const next = new URLSearchParams(params);
  next.delete("cursor");
  next.delete("volverA");
  for (const [key, value] of Object.entries(values)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return listHref(next);
}
export function ticketReturnHref(value: string | null) {
  // Only a local tickets list is eligible; never turn a URL parameter into an open redirect.
  if (!value || !(value === LIST_PATH || value.startsWith(`${LIST_PATH}?`))) return LIST_PATH;
  const url = new URL(value, "https://ice24.invalid");
  const query = ticketQuery(url.searchParams);
  const view = url.searchParams.get("vista");
  if (view === "lista" || view === "bloques") query.set("vista", view);
  return listHref(query);
}
export const ticketState = (ticket: Ticket) =>
  (ticket.displayState ?? ticket.state) === "pending_assignment" && ticket.workOrderId
    ? { label: "Orden asignada", tone: "info" as const }
    : TICKET_STATES[ticket.displayState ?? ticket.state];
export const ticketDate = (value: string, timeZone = "America/Mexico_City") =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone }).format(
    new Date(value),
  );
export function ticketAge(createdAt: string, asOf: string) {
  const hours = Math.max(0, Math.floor((Date.parse(asOf) - Date.parse(createdAt)) / 3_600_000));
  if (hours < 1) return "Menos de una hora";
  if (hours < 24) return `${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "día" : "días"}`;
}
export const EVENT_LABELS: Record<string, string> = {
  TicketCreated: "Ticket reportado",
  TicketDiagnosed: "Diagnóstico actualizado",
  TicketAssigned: "Técnico asignado",
  TicketWorkOrderStarted: "Atención iniciada",
  TicketCompleted: "Ticket resuelto",
  TicketResolved: "Ticket resuelto",
  TicketCancelled: "Ticket cancelado",
  WorkOrderCreated: "Orden de trabajo creada",
  WorkOrderAssigned: "Responsable de la orden actualizado",
  WorkOrderTransitioned: "Estado de la orden actualizado",
  WorkOrderExecutionSaved: "Avance de la orden registrado",
};
const TRANSITION_REASONS: Record<string, string> = {
  notify: "Aviso de mantenimiento próximo",
  expire: "La fecha programada venció",
  start: "Atención iniciada",
  complete: "Trabajo concluido",
  observe: "Trabajo con observaciones",
  reject: "Trabajo no conforme",
  correct: "Corrección registrada",
  cancel: "Orden cancelada",
  reopen: "Orden reabierta",
};
export const ticketEventReason = (operation: string, reason: string) =>
  operation === "WorkOrderTransitioned" ? (TRANSITION_REASONS[reason] ?? reason) : reason;
export interface TicketsAccess {
  contextId: string;
  csrfToken: string;
  permissions: readonly string[];
  demoOffline?: boolean;
}
