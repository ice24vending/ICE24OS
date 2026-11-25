/** Filters of the alert center, shared by the server page (`?filtro=`) and the client. */
export const FILTERS = [
  { id: "todas", label: "Todas", query: "" },
  { id: "criticas", label: "Críticas", query: "priority=critical" },
  { id: "no-enteradas", label: "No enteradas", query: "unacknowledged=true" },
  { id: "en-atencion", label: "En atención", query: "status=in_progress" },
  { id: "resueltas", label: "Resueltas", query: "status=resolved" },
] as const;
/** Only reachable from its KPI: the pinned section already lists these alerts under «Todas». */
export const PINNED_FILTER = {
  id: "criticas-sin-enterado",
  label: "Críticas sin enterado",
  query: "pinned=true",
} as const;
export type FilterId = (typeof FILTERS)[number]["id"] | typeof PINNED_FILTER.id;

const ALL = [...FILTERS, PINNED_FILTER] as const;
export const filterOf = (id: FilterId) => ALL.find((filter) => filter.id === id)!;
export const parseFilter = (value: unknown): FilterId =>
  ALL.find((filter) => filter.id === value)?.id ?? "todas";
export const filterHref = (id: FilterId) =>
  id === "todas" ? "/notifications" : `/notifications?filtro=${id}`;
/** The detail keeps the list filter so «Volver» returns to the same view. */
export const detailHref = (id: string, filter: FilterId = "todas") =>
  filter === "todas" ? `/notifications/${id}` : `/notifications/${id}?filtro=${filter}`;
