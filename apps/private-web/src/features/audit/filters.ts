/** Audit filters of the viewer (PRD RF-AUD-014, F5-15: actor, action, date, entity, correlation). */
export const UUID_FILTERS = [
  "actorUserId",
  "entityId",
  "correlationId",
  "branchId",
  "machineId",
  "accountId",
] as const;
export const TEXT_FILTERS = ["operation", "entityType", "result"] as const;
export type AuditFilterName =
  (typeof UUID_FILTERS)[number] | (typeof TEXT_FILTERS)[number] | "from" | "to" | "scope";
export type AuditFilters = Partial<Record<AuditFilterName, string>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const NAME = /^[A-Za-z][A-Za-z0-9_.]{0,79}$/u;

export const FILTER_LABELS: Record<AuditFilterName, string> = {
  from: "Desde (UTC)",
  to: "Hasta (UTC)",
  operation: "Tipo de evento",
  actorUserId: "Actor (ID)",
  result: "Estado",
  entityType: "Tipo de entidad",
  entityId: "Entidad (ID)",
  correlationId: "Correlación",
  branchId: "Sucursal (ID)",
  machineId: "Máquina (ID)",
  scope: "Ámbito",
  accountId: "Cuenta (ID, opcional)",
};

/**
 * Validates raw filter values (form or URL) and returns field errors in Spanish plus the clean
 * filters. Dates are whole UTC days; identifiers must be UUIDs. Unknown names are dropped.
 */
export function validateFilters(raw: Record<string, string | undefined>): {
  filters: AuditFilters;
  errors: Partial<Record<AuditFilterName, string>>;
} {
  const filters: AuditFilters = {};
  const errors: Partial<Record<AuditFilterName, string>> = {};
  for (const name of UUID_FILTERS) {
    const value = raw[name]?.trim();
    if (!value) continue;
    if (UUID.test(value)) filters[name] = value.toLowerCase();
    else errors[name] = "Escribe un identificador completo (UUID).";
  }
  for (const name of ["operation", "entityType"] as const) {
    const value = raw[name]?.trim();
    if (!value) continue;
    if (NAME.test(value)) filters[name] = value;
    else errors[name] = "Usa el nombre técnico, sin espacios (por ejemplo, JobRetryRequested).";
  }
  const result = raw.result?.trim();
  if (result && ["SUCCESS", "DENIED", "FAILED"].includes(result)) filters.result = result;
  for (const name of ["from", "to"] as const) {
    const value = raw[name]?.trim();
    if (!value) continue;
    if (DATE.test(value) && !Number.isNaN(Date.parse(value))) filters[name] = value;
    else errors[name] = "Usa una fecha válida.";
  }
  if (filters.from && filters.to && filters.from > filters.to)
    errors.to = "La fecha final debe ser igual o posterior a la inicial.";
  if (raw.scope === "global") filters.scope = "global";
  return { filters, errors };
}

/** BFF query string for validated filters (dates expanded to whole UTC days). */
export function toQuery(filters: AuditFilters): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) {
    if (!value) continue;
    if (name === "from") params.set("from", `${value}T00:00:00.000Z`);
    else if (name === "to") params.set("to", `${value}T23:59:59.999999Z`);
    else params.set(name, value);
  }
  return params.toString();
}

/** Short description of the active filters for the results status line. */
export const describeFilters = (filters: AuditFilters) =>
  Object.entries(filters)
    .filter(([name, value]) => value && name !== "scope")
    .map(([name, value]) => `${FILTER_LABELS[name as AuditFilterName]}: ${value}`)
    .join(" · ");
