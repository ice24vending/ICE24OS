import { randomBytes } from "node:crypto";

import type { AccountAccessMode } from "@ice24/authorization";
import type { ContextFocus } from "@ice24/contracts";

import { DEMO_ACCOUNTS, isDemoAccountKey, isDemoBranchOf, type DemoAccountKey } from "./fixtures";
import { isDemoPersonaKey, type DemoPersonaKey } from "./personas";

export type DemoNetwork = "online" | "slow" | "error" | "offline";

/** What the floating "Demo" panel lets the reviewer change. */
export interface DemoState {
  readonly persona: DemoPersonaKey;
  readonly account: DemoAccountKey;
  /** Branch assigned to the branch administrator and the technician; ignored by account roles. */
  readonly branch: string;
  readonly mode: AccountAccessMode;
  readonly network: DemoNetwork;
  /** Branch and machine chosen in the context selector (F6-08); absent means "all". */
  readonly focus?: ContextFocus | undefined;
  /** Random per demo start; the demo session uses it as its CSRF token. */
  readonly csrf: string;
}

export const DEMO_COOKIE = "ice24_demo";
/** Prefix of the access token of a demo session. A real Supabase JWT never starts with it. */
export const DEMO_TOKEN_PREFIX = "ice24-demo.";

const MODES: readonly AccountAccessMode[] = ["ACTIVE", "READ_ONLY", "SUSPENDED"];
const NETWORKS: readonly DemoNetwork[] = ["online", "slow", "error", "offline"];

export const defaultDemoState = (): DemoState => ({
  persona: "owner",
  account: "polar",
  branch: DEMO_ACCOUNTS.polar.branches[0]!.id,
  mode: "ACTIVE",
  network: "online",
  csrf: randomBytes(24).toString("base64url"),
});

/**
 * Validates every field against the fixtures; anything unknown falls back to the defaults, so a
 * hand-edited cookie can only select another fictitious persona, never a real identity.
 */
export function normalizeDemoState(
  value: Partial<Record<keyof DemoState, unknown>>,
  base: DemoState,
): DemoState {
  const account = isDemoAccountKey(value.account) ? value.account : base.account;
  const branch =
    typeof value.branch === "string" && isDemoBranchOf(account, value.branch)
      ? value.branch
      : isDemoBranchOf(account, base.branch)
        ? base.branch
        : DEMO_ACCOUNTS[account].branches[0]!.id;
  const focus = (value.focus ?? base.focus) as Partial<ContextFocus> | undefined;
  return {
    persona: isDemoPersonaKey(value.persona) ? value.persona : base.persona,
    account,
    branch,
    mode: MODES.includes(value.mode as AccountAccessMode)
      ? (value.mode as AccountAccessMode)
      : base.mode,
    network: NETWORKS.includes(value.network as DemoNetwork)
      ? (value.network as DemoNetwork)
      : base.network,
    csrf:
      typeof value.csrf === "string" && /^[A-Za-z0-9_-]{32}$/.test(value.csrf)
        ? value.csrf
        : base.csrf,
    // Only ids of the chosen account survive; reach by persona is checked by the demo API.
    ...(isDemoFocusOf(account, focus) ? { focus } : {}),
  };
}

function isDemoFocusOf(
  account: DemoAccountKey,
  focus: Partial<ContextFocus> | undefined,
): focus is ContextFocus {
  if (typeof focus !== "object" || focus === null) return false;
  const { branchId, machineId } = focus;
  const machine = DEMO_ACCOUNTS[account].machines.find((item) => item.id === machineId);
  return (
    (branchId === null || (typeof branchId === "string" && isDemoBranchOf(account, branchId))) &&
    (machineId === null ||
      (machine !== undefined && (branchId === null || machine.branchId === branchId)))
  );
}

export const encodeDemoState = (state: DemoState): string =>
  Buffer.from(JSON.stringify(state), "utf8").toString("base64url");

export function decodeDemoState(encoded: string | undefined): DemoState | undefined {
  if (!encoded || encoded.length > 1024) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const base = defaultDemoState();
    return normalizeDemoState(parsed as Partial<Record<keyof DemoState, unknown>>, base);
  } catch {
    return undefined;
  }
}

export const demoAccessToken = (state: DemoState): string =>
  `${DEMO_TOKEN_PREFIX}${encodeDemoState(state)}`;

export const demoStateFromToken = (accessToken: string): DemoState | undefined =>
  accessToken.startsWith(DEMO_TOKEN_PREFIX)
    ? decodeDemoState(accessToken.slice(DEMO_TOKEN_PREFIX.length))
    : undefined;

export const DEMO_MODE_LABELS: Readonly<Record<AccountAccessMode, string>> = {
  ACTIVE: "Activa",
  READ_ONLY: "Solo lectura (pago rechazado)",
  SUSPENDED: "Suspendida por ICE24",
};

export const DEMO_NETWORK_LABELS: Readonly<Record<DemoNetwork, string>> = {
  online: "Normal",
  slow: "Carga lenta (2.5 s)",
  error: "Error del servicio",
  offline: "Sin conexión",
};
