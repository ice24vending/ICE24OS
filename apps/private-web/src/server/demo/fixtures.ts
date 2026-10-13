/**
 * Fictitious data of the demo mode. Names, places and identifiers are invented; no real customer,
 * machine or person is represented. Every response built from here is validated against the
 * @ice24/contracts schemas in `api.test.ts`, so screens render it exactly like API data.
 */
import type { DemoPersonaKey } from "./personas";

/** Valid RFC 4122 v4-shaped identifiers, readable by their prefix. */
const uuid = (prefix: string, n: number) =>
  `${prefix}-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

export const demoIds = {
  account: (n: number) => uuid("a0000000", n),
  branch: (n: number) => uuid("b0000000", n),
  machine: (n: number) => uuid("c0000000", n),
  membership: (n: number) => uuid("d0000000", n),
  user: (n: number) => uuid("e0000000", n),
  context: (n: number) => uuid("f0000000", n),
  job: (n: number) => uuid("10000000", n),
  audit: (n: number) => uuid("20000000", n),
  notification: (n: number) => uuid("30000000", n),
  subscription: (n: number) => uuid("40000000", n),
  model: (n: number) => uuid("50000000", n),
  template: (n: number) => uuid("51000000", n),
  catalog: (n: number) => uuid("60000000", n),
  request: (n: number) => uuid("70000000", n),
  session: (n: number) => uuid("90000000", n),
  correlation: (n: number) => uuid("c0ffee00", n),
};

export interface DemoBranch {
  readonly id: string;
  readonly name: string;
  readonly address: string;
}

export interface DemoMachine {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly branchId: string;
  readonly modelId: string;
  readonly status: "available" | "maintenance" | "out_of_service" | "off";
}

export interface DemoAccount {
  readonly key: DemoAccountKey;
  readonly id: string;
  readonly name: string;
  /** Paid accounts become `payment_failed` in read-only mode; demo accounts expire. */
  readonly isDemo: boolean;
  readonly branches: readonly DemoBranch[];
  readonly machines: readonly DemoMachine[];
}

export type DemoAccountKey = "polar" | "bajio";

const MODELS = [
  { id: demoIds.model(1), code: "IC-500", name: "Despachadora de hielo IC-500" },
  { id: demoIds.model(2), code: "IC-900", name: "Fábrica de hielo IC-900" },
  { id: demoIds.model(3), code: "AP-200", name: "Purificadora de agua AP-200" },
] as const;

export const DEMO_MODELS = MODELS;

export const DEMO_ACCOUNTS: Readonly<Record<DemoAccountKey, DemoAccount>> = {
  polar: {
    key: "polar",
    id: demoIds.account(1),
    name: "Hielo Polar del Norte",
    isDemo: false,
    branches: [
      { id: demoIds.branch(1), name: "Centro Monterrey", address: "Av. Juárez 1200, Centro" },
      { id: demoIds.branch(2), name: "Cumbres", address: "Paseo de los Leones 455, Cumbres" },
    ],
    machines: [
      {
        id: demoIds.machine(1),
        code: "ICE24-MTY-0001",
        name: "Despachadora Juárez",
        branchId: demoIds.branch(1),
        modelId: demoIds.model(1),
        status: "available",
      },
      {
        id: demoIds.machine(2),
        code: "ICE24-MTY-0002",
        name: "Fábrica Centro",
        branchId: demoIds.branch(1),
        modelId: demoIds.model(2),
        status: "maintenance",
      },
      {
        id: demoIds.machine(3),
        code: "ICE24-MTY-0003",
        name: "Despachadora Leones",
        branchId: demoIds.branch(2),
        modelId: demoIds.model(1),
        status: "available",
      },
      {
        id: demoIds.machine(4),
        code: "ICE24-MTY-0004",
        name: "Purificadora Cumbres",
        branchId: demoIds.branch(2),
        modelId: demoIds.model(3),
        status: "out_of_service",
      },
    ],
  },
  bajio: {
    key: "bajio",
    id: demoIds.account(2),
    name: "Agua y Hielo del Bajío",
    isDemo: true,
    branches: [
      { id: demoIds.branch(3), name: "Planta León", address: "Blvd. Adolfo López Mateos 300" },
      { id: demoIds.branch(4), name: "Punto Irapuato", address: "Calle Guerrero 88, Centro" },
    ],
    machines: [
      {
        id: demoIds.machine(5),
        code: "ICE24-LEO-0001",
        name: "Fábrica León",
        branchId: demoIds.branch(3),
        modelId: demoIds.model(2),
        status: "available",
      },
      {
        id: demoIds.machine(6),
        code: "ICE24-IRA-0001",
        name: "Purificadora Irapuato",
        branchId: demoIds.branch(4),
        modelId: demoIds.model(3),
        status: "off",
      },
    ],
  },
};

export const isDemoAccountKey = (value: unknown): value is DemoAccountKey =>
  typeof value === "string" && Object.hasOwn(DEMO_ACCOUNTS, value);

export const isDemoBranchOf = (account: DemoAccountKey, branchId: string) =>
  DEMO_ACCOUNTS[account].branches.some((branch) => branch.id === branchId);

export const demoAccountById = (id: string) =>
  Object.values(DEMO_ACCOUNTS).find((account) => account.id === id);

const PERSONA_INDEX: Readonly<Record<DemoPersonaKey, number>> = {
  owner: 1,
  admin: 2,
  technician: 3,
  readonly: 4,
  ice24: 5,
};
const ACCOUNT_INDEX: Readonly<Record<DemoAccountKey, number>> = { polar: 0, bajio: 1 };

export const demoUserId = (persona: DemoPersonaKey) => demoIds.user(PERSONA_INDEX[persona]);
export const demoMembershipId = (persona: DemoPersonaKey, account: DemoAccountKey) =>
  demoIds.membership(ACCOUNT_INDEX[account] * 10 + PERSONA_INDEX[persona]);
export const demoContextId = (persona: DemoPersonaKey, account: DemoAccountKey) =>
  demoIds.context(ACCOUNT_INDEX[account] * 10 + PERSONA_INDEX[persona]);

/** Timestamps relative to the moment of the request, so demo deadlines never look expired. */
export const at = (now: number, days: number, hours = 0) =>
  new Date(now + days * 86_400_000 + hours * 3_600_000).toISOString();
