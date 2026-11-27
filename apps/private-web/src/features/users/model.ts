import type { AccountMember } from "@ice24/contracts";
import type { EquipmentClient } from "../equipment/configuration-client";
import { SCOPE_NAMES, type MemberScope } from "./labels";

export interface ScopeOptions {
  readonly branches: readonly { id: string; name: string }[];
  readonly machines: readonly { id: string; label: string; branchId: string }[];
}
export interface WorkspaceAccess {
  canManage: boolean;
  hasMfa: boolean;
  accessMode: string;
  accountWide: boolean;
}
interface Row {
  id: string;
  status?: string;
  branch_id?: string;
  machine_code?: string;
  operational_status?: string;
  data?: { name?: string; internalName?: string };
}

export const USERS_TAB_HREF = "/account?pestana=usuarios";

/** Active branches and machines a scope may name, read with the same equipment endpoints. */
export async function loadScopeOptions(client: EquipmentClient): Promise<ScopeOptions> {
  const [branches, machines] = await Promise.all([
    client.get<Row[]>("branches"),
    client.get<Row[]>("machines"),
  ]);
  const names = new Map(branches.map((b) => [b.id, b.data?.name ?? "Sucursal sin nombre"]));
  return {
    branches: branches
      .filter((b) => b.status === "active")
      .map((b) => ({ id: b.id, name: names.get(b.id)! })),
    machines: machines
      .filter((m) => m.operational_status !== "retired")
      .map((m) => ({
        id: m.id,
        branchId: m.branch_id ?? "",
        label: [m.data?.internalName, m.machine_code, names.get(m.branch_id ?? "")]
          .filter(Boolean)
          .join(" · "),
      })),
  };
}

export const scopeOf = (member: AccountMember): MemberScope =>
  member.account_wide ? "ACCOUNT" : member.machine_ids.length ? "MACHINE" : "BRANCH";

/** «Sucursales: Centro, Cumbres» with names when known, a count otherwise. */
export function scopeSummary(member: AccountMember, options?: ScopeOptions): string {
  const scope = scopeOf(member);
  if (scope === "ACCOUNT") return SCOPE_NAMES.ACCOUNT;
  const ids = scope === "BRANCH" ? member.branch_ids : member.machine_ids;
  const known = new Map<string, string>([
    ...(options?.branches ?? []).map((b) => [b.id, b.name] as const),
    ...(options?.machines ?? []).map((m) => [m.id, m.label] as const),
  ]);
  const names = ids.map((id) => known.get(id));
  if (!names.every(Boolean)) return `${SCOPE_NAMES[scope]}: ${ids.length}`;
  // Two names keep the row short; the person's page lists the rest.
  return `${SCOPE_NAMES[scope]}: ${names.slice(0, 2).join(", ")}${
    names.length > 2 ? ` y ${names.length - 2} más` : ""
  }`;
}

/** Short local date and time in the account's zone, or «Nunca» for a person who never entered. */
export const formatAccess = (value: string | null, timeZone = "America/Mexico_City") =>
  value
    ? new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
      }).format(new Date(value))
    : "Nunca";
