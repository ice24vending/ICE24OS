import { notFound } from "next/navigation";

import { readBrowserSession } from "../session/session";
import { callPrivateApi } from "../session/supabase-auth";
import { upstreamCorrelation } from "../bff/responses";
import { loadAccountShell } from "../account/shell";
import { DEMO_ACCOUNTS, DEMO_MODELS } from "./fixtures";
import { demoStateOf } from "./session";
import type { DemoScenario } from "./state";

/**
 * Data of the «Plantillas» screens (F6-09/F6-10): one example per layout with fictitious ice
 * machines. Only in demo mode; the machines come through the demo API, so the panel's persona,
 * account mode and network (slow, error, offline) reach these screens like any other.
 */
export interface TemplateMachine {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly branch: string;
  readonly model: string;
  readonly operation: "available" | "maintenance" | "out_of_service" | "off";
  readonly technical: "optimal" | "preventive_attention" | "critical";
  readonly sanitary: "up_to_date" | "expiring_soon" | "corrective_action";
  /** Ice produced today; null when the machine did not report (never shown as zero). */
  readonly productionKg: number | null;
  readonly lastService: string;
}

export type TemplateFailure =
  | { readonly kind: "forbidden" | "offline" }
  | { readonly kind: "error"; readonly correlationId?: string | undefined };

export interface TemplateData {
  readonly machines: readonly TemplateMachine[];
  readonly failure: TemplateFailure | null;
  readonly scenario: DemoScenario;
  readonly readOnly: boolean;
  readonly accountId: string | null;
  readonly accountName: string;
  readonly contextId: string;
  readonly csrfToken: string;
}

const TECHNICAL = ["optimal", "preventive_attention", "optimal", "critical"] as const;
const SANITARY = ["up_to_date", "up_to_date", "expiring_soon", "corrective_action"] as const;
const PRODUCTION = [412, 0, 388, null, 655, null] as const;
const SERVICE = [
  "14/10/2026",
  "02/10/2026",
  "18/10/2026",
  "21/09/2026",
  "11/10/2026",
  "30/09/2026",
];

interface MachineRow {
  readonly id: string;
  readonly name: string;
  readonly machine_code: string;
  readonly status: TemplateMachine["operation"];
  readonly model_id: string;
  readonly branch_id: string;
}

/** Demo session of a template page; outside the demo the templates do not exist (404). */
export async function requireTemplates() {
  const session = await readBrowserSession();
  const state = session && demoStateOf(session);
  if (!session?.contextId || !state) notFound();
  return { session: { ...session, contextId: session.contextId }, state };
}

export async function loadTemplateData(): Promise<TemplateData> {
  const { session, state } = await requireTemplates();
  const shell = await loadAccountShell(session);
  const account = DEMO_ACCOUNTS[state.account];
  const scenario = state.scenario ?? "normal";
  const base = {
    scenario,
    readOnly: state.mode !== "ACTIVE",
    accountId: shell.selector.current?.accountId ?? null,
    accountName: account.name,
    contextId: session.contextId,
    csrfToken: session.csrfToken,
  };
  const failed = (failure: TemplateFailure): TemplateData => ({ ...base, machines: [], failure });
  if (scenario === "forbidden") return failed({ kind: "forbidden" });
  let response: Response;
  try {
    response = await callPrivateApi("machines", session, { signal: AbortSignal.timeout(10_000) });
  } catch {
    return failed({ kind: "offline" });
  }
  if (response.status === 403) return failed({ kind: "forbidden" });
  if (!response.ok)
    return failed({ kind: "error", correlationId: await upstreamCorrelation(response) });
  const rows = ((await response.json()) as MachineRow[]).slice(0, 6);
  const machines = rows.map((row, index): TemplateMachine => ({
    id: row.id,
    code: row.machine_code,
    name: row.name,
    branch: account.branches.find((branch) => branch.id === row.branch_id)?.name ?? "—",
    model: DEMO_MODELS.find((model) => model.id === row.model_id)?.name ?? "—",
    operation: row.status,
    technical: TECHNICAL[index % TECHNICAL.length]!,
    sanitary: SANITARY[index % SANITARY.length]!,
    productionKg: row.status === "available" ? (PRODUCTION[index] ?? null) : null,
    lastService: SERVICE[index]!,
  }));
  return { ...base, machines: scenario === "empty" ? [] : machines, failure: null };
}
