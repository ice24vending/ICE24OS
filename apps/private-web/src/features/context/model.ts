import type {
  AccessContext,
  ContextFocus,
  ContextFocusOptions,
} from "@ice24/contracts";

import { destinationOf } from "../navigation/destinations";

/** Names of `authz.roles` (Phase 3 migration), as the selector shows them. */
export const ROLE_LABELS: Readonly<Record<string, string>> = {
  IA: "ICE24 Admin",
  IO: "ICE24 Operaciones",
  OW: "Propietario de cuenta",
  TC: "Técnico",
  OP: "Operador",
  SA: "Responsable sanitario",
  DV: "Repartidor",
  RA: "Restaurante Admin",
  AU: "Consulta/Auditor",
};

export const roleLabel = (codes: readonly string[]) =>
  codes.map((code) => ROLE_LABELS[code] ?? code).join(" · ") || "Sin rol";

/** One account the viewer may switch to; only what the selector draws reaches the browser. */
export interface ContextAccount {
  readonly accountId: string;
  readonly accountName: string;
  readonly roles: string;
  readonly readOnly: boolean;
}

export const contextAccount = (context: AccessContext): ContextAccount => ({
  accountId: context.accountId,
  accountName: context.accountName,
  roles: roleLabel(context.roleCodes),
  readOnly: context.accessMode === "READ_ONLY",
});

/**
 * What the topbar selector receives from the server (F6-08). Each list is `null` when its load
 * failed: the selector says so and keeps the current context instead of guessing.
 */
export interface ContextSelectorData {
  readonly current: ContextAccount | null;
  readonly accounts: readonly ContextAccount[] | null;
  /** `forbidden`: the role cannot read equipment, so it works on the whole account. */
  readonly options: ContextFocusOptions | "forbidden" | null;
  readonly branch: ContextFocusOptions["branches"][number] | null;
  readonly machine: ContextFocusOptions["machines"][number] | null;
  /** The saved branch or machine is no longer within reach: the shell fell back to "all". */
  readonly focusLost: boolean;
}

/**
 * Focus actually in effect: the saved ids only count while the API still lists them for this
 * context. A focus the viewer lost access to falls back to "all" and is reported as lost.
 */
export function resolveFocus(
  saved: ContextFocus | undefined,
  options: ContextSelectorData["options"],
): Pick<ContextSelectorData, "branch" | "machine" | "focusLost"> {
  const wanted = saved && (saved.branchId !== null || saved.machineId !== null);
  if (!wanted) return { branch: null, machine: null, focusLost: false };
  // A failed load proves nothing: show "all" without claiming the access was lost.
  if (options === null) return { branch: null, machine: null, focusLost: false };
  if (options === "forbidden") return { branch: null, machine: null, focusLost: true };
  const branch = options.branches.find((item) => item.id === saved.branchId) ?? null;
  const machine = options.machines.find((item) => item.id === saved.machineId) ?? null;
  const lost =
    (saved.branchId !== null && branch === null) ||
    (saved.machineId !== null &&
      (machine === null || (saved.branchId !== null && machine.branchId !== saved.branchId)));
  return lost
    ? { branch: null, machine: null, focusLost: true }
    : { branch, machine, focusLost: false };
}

/** Internal path to come back to; anything absolute, protocol-relative or of the BFF is refused. */
export const safePath = (value: unknown): string | null =>
  typeof value === "string" &&
  value.startsWith("/") &&
  !value.startsWith("//") &&
  !value.startsWith("/\\") &&
  !value.startsWith("/api/") &&
  value.length <= 2048
    ? value
    : null;

/**
 * Where to land after switching (F6-08). Within the same account the page stays as it was. In
 * another account, ids in the old path mean nothing: the viewer lands at the start of the same
 * module if the new context may open it, or at its first authorized destination otherwise.
 */
export function locationAfterSwitch(
  returnTo: unknown,
  destinations: readonly { readonly href: string }[],
  sameAccount: boolean,
): string {
  const path = safePath(returnTo);
  if (path !== null && sameAccount) return path;
  const pathname = path?.split(/[?#]/u)[0] ?? "";
  return (
    destinationOf(pathname, destinations)?.href ?? destinations[0]?.href ?? "/profile"
  );
}
