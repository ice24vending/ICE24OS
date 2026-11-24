import { entityLabel, operationLabel, OUTCOMES } from "./labels";

export const AUDIT_PAGE_SIZE = 10;
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
    const value = (
      name === "correlationId" ? (raw.correlation ?? raw.correlationId) : raw[name]
    )?.trim();
    if (!value) continue;
    if (UUID.test(value)) filters[name] = value.toLowerCase();
    else errors[name] = "Escribe un identificador completo (UUID).";
  }
  for (const name of ["operation", "entityType"] as const) {
    const value = raw[name]?.trim();
    if (!value) continue;
    if (NAME.test(value)) filters[name] = value;
    else errors[name] = "Selecciona una opción de la lista.";
  }
  const result = raw.result?.trim();
  if (result && ["SUCCESS", "DENIED", "FAILED"].includes(result)) filters.result = result;
  for (const name of ["from", "to"] as const) {
    const value = raw[name]?.trim();
    if (!value) continue;
    if (
      DATE.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value
    )
      filters[name] = value;
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
    .map(
      ([name, value]) =>
        `${FILTER_LABELS[name as AuditFilterName]}: ${
          name === "operation"
            ? operationLabel(value!)
            : name === "entityType"
              ? entityLabel(value!)
              : name === "result"
                ? OUTCOMES[value as keyof typeof OUTCOMES]
                : value
        }`,
    )
    .join(" · ");

export interface AuditPagination {
  page: number;
  cursors: (string | null)[];
}
export function auditPagination(raw: Record<string, string | undefined>): AuditPagination {
  try {
    const page = Number(raw.page ?? 1) - 1;
    const cursors: unknown = JSON.parse(raw.cursors ?? "[null]");
    if (
      Number.isInteger(page) &&
      page >= 0 &&
      page < 100 &&
      Array.isArray(cursors) &&
      cursors.length <= 100 &&
      cursors[0] === null &&
      page < cursors.length &&
      cursors
        .slice(1)
        .every((cursor) => typeof cursor === "string" && /^[A-Za-z0-9_-]{1,512}$/.test(cursor))
    )
      return { page, cursors: cursors.slice(0, page + 1) as (string | null)[] };
  } catch {
    /* Invalid navigation state starts on the first page. */
  }
  return { page: 0, cursors: [null] };
}

/** Browser URLs use date-only values and `correlation`; API requests use `toQuery`. */
export function auditLocation(
  filters: AuditFilters,
  pagination: AuditPagination = { page: 0, cursors: [null] },
): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(filters))
    if (value) query.set(name === "correlationId" ? "correlation" : name, value);
  if (pagination.page > 0) {
    query.set("page", String(pagination.page + 1));
    query.set("cursors", JSON.stringify(pagination.cursors));
  }
  return `/audit${query.size ? `?${query}` : ""}`;
}

/** Rebuild from an allowlist: no external URL, alternate path or recursive return target. */
export function auditReturn(value: string | null | undefined): string {
  if (!value?.startsWith("/audit")) return "/audit";
  try {
    const url = new URL(value, "https://ice24.invalid");
    if (url.origin !== "https://ice24.invalid" || url.pathname !== "/audit") return "/audit";
    const raw = Object.fromEntries(url.searchParams);
    return auditLocation(validateFilters(raw).filters, auditPagination(raw));
  } catch {
    return "/audit";
  }
}

export function auditDetailHref(id: string, origin: string, global: boolean): string {
  const query = new URLSearchParams({ origen: auditReturn(origin) });
  if (global) query.set("scope", "global");
  return `/audit/${encodeURIComponent(id)}?${query}`;
}
