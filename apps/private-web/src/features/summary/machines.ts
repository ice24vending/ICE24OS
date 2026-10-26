export interface SummaryMachine {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly branch: string;
  readonly status: string;
}

type Row = Record<string, unknown>;
const isRow = (value: unknown): value is Row => typeof value === "object" && value !== null;
const text = (value: unknown) => (typeof value === "string" && value !== "" ? value : null);

/**
 * Machines of the summary from the account catalog rows (`GET machines`, `GET branches`), which
 * have no shared contract. Any row without an id or status makes the whole answer invalid
 * (`null`): the section shows an error instead of a partial, misleading list.
 */
export function toSummaryMachines(machines: unknown, branches: unknown): SummaryMachine[] | null {
  if (!Array.isArray(machines) || !Array.isArray(branches)) return null;
  if (!machines.every((row) => isRow(row) && text(row.id) && text(row.status))) return null;
  const branchNames = new Map(
    branches.filter(isRow).flatMap((row) => {
      const id = text(row.id);
      const name = text(row.name);
      return id && name ? [[id, name] as const] : [];
    }),
  );
  return (machines as Row[]).map((row) => ({
    id: row.id as string,
    status: row.status as string,
    code: text(row.machine_code) ?? "—",
    name: text(row.name) ?? "Sin nombre",
    branch: branchNames.get(text(row.branch_id) ?? "") ?? "Sin sucursal",
  }));
}
