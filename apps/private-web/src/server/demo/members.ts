import {
  MEMBER_ACTIVITY_DAYS,
  memberActivityPeriodSchema,
  type AccountMember,
  type AccountMemberDetail,
} from "@ice24/contracts";
import type { DemoRequest } from "./api";
import { at, demoIds, demoMembershipId } from "./fixtures";
import { DEMO_PERSONAS, type DemoPersonaKey } from "./personas";
import { demoTickets } from "./tickets";
import { demoWorkOrders } from "./work-orders";

/** Account people of the demo (UXD-09): every persona plus an invited and a suspended person. */
interface DemoMember {
  readonly key: string;
  readonly id: string;
  readonly status: AccountMember["status"];
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly jobTitle: string | null;
  readonly role: string;
  readonly scope: "ACCOUNT" | "BRANCH" | "MACHINE";
  readonly lastAccessHours: number | null;
  /** Month totals: completed maintenance, tickets created and attended, orders assigned. */
  readonly month: readonly [number, number, number, number];
}

const PERSONA_DATA: Partial<
  Record<DemoPersonaKey, Pick<DemoMember, "phone" | "jobTitle" | "lastAccessHours" | "month">>
> = {
  owner: {
    phone: "+52 81 8340 1200",
    jobTitle: "Directora general",
    lastAccessHours: 1,
    month: [0, 6, 4, 0],
  },
  admin: {
    phone: "+52 81 8340 1215",
    jobTitle: "Gerente de sucursal",
    lastAccessHours: 5,
    month: [2, 9, 7, 3],
  },
  technician: {
    phone: "+52 81 1932 4410",
    jobTitle: "Técnica de refrigeración",
    lastAccessHours: 26,
    month: [14, 3, 11, 18],
  },
  readonly: { phone: null, jobTitle: "Auditor externo", lastAccessHours: 240, month: [0, 0, 0, 0] },
  // ICE24 staff with a membership in the account appear like in the real list (UXD-00B).
  ice24: { phone: null, jobTitle: "Soporte ICE24", lastAccessHours: 72, month: [0, 0, 0, 0] },
  platform: {
    phone: null,
    jobTitle: "Administración ICE24",
    lastAccessHours: 168,
    month: [0, 0, 0, 0],
  },
};

function members(request: DemoRequest): DemoMember[] {
  const account = request.account.key;
  const personas = (Object.keys(PERSONA_DATA) as DemoPersonaKey[]).map((key): DemoMember => {
    const persona = DEMO_PERSONAS[key];
    return {
      key,
      id: demoMembershipId(key, account),
      status: "ACTIVE",
      name: persona.displayName,
      email: `${persona.username}@demo.invalid`,
      role: persona.role,
      scope: persona.scope,
      ...PERSONA_DATA[key]!,
    };
  });
  const offset = account === "bajio" ? 10 : 0;
  return [
    ...personas,
    {
      key: "invited",
      id: demoIds.membership(offset + 7),
      status: "PENDING",
      name: "Mariana Ríos",
      email: "mariana.rios@demo.invalid",
      phone: "+52 81 2201 7788",
      jobTitle: "Responsable de calidad",
      role: "SA",
      scope: "BRANCH",
      lastAccessHours: null,
      month: [0, 0, 0, 0],
    },
    {
      key: "suspended",
      id: demoIds.membership(offset + 8),
      status: "SUSPENDED",
      name: "Héctor Luna",
      email: "hector.luna@demo.invalid",
      phone: null,
      jobTitle: "Técnico eventual",
      role: "TC",
      scope: "MACHINE",
      lastAccessHours: 480,
      month: [5, 1, 2, 6],
    },
  ];
}

function row(request: DemoRequest, member: DemoMember): AccountMember {
  const branch = request.state.branch;
  return {
    id: member.id,
    row_version: 1,
    status: member.status,
    display_name: member.name,
    email: member.email,
    phone: member.phone,
    job_title: member.jobTitle,
    roles: [member.role],
    is_primary_owner: member.key === "owner",
    account_wide: member.scope === "ACCOUNT",
    branch_ids: member.scope === "BRANCH" ? [branch] : [],
    machine_ids:
      member.scope === "MACHINE"
        ? request.account.machines.filter((m) => m.branchId === branch).map((m) => m.id)
        : [],
    denies_equipment_changes: member.key === "readonly",
    last_access_at:
      member.lastAccessHours === null ? null : at(request.now, 0, -member.lastAccessHours),
  };
}

export const demoMembers = (request: DemoRequest): AccountMember[] =>
  request.state.scenario === "empty"
    ? []
    : members(request)
        .map((member) => row(request, member))
        .sort((a, b) => a.display_name.localeCompare(b.display_name, "es-MX"));

/** Varied activity per person; a shorter window shows a fraction of the month (1, 7, 30 days). */
export function demoMemberDetail(
  request: DemoRequest,
  id: string,
  period: string | null,
): AccountMemberDetail | null {
  const member = members(request).find((candidate) => candidate.id === id);
  if (!member) return null;
  const window = memberActivityPeriodSchema.catch("week").parse(period ?? "week");
  const share = MEMBER_ACTIVITY_DAYS[window] / 30;
  const [maintenance, created, attended, assigned] = member.month.map((n) =>
    Math.round(n * share),
  ) as [number, number, number, number];
  const from = new Date(request.now - (MEMBER_ACTIVITY_DAYS[window] - 1) * 86_400_000);
  from.setUTCHours(6, 0, 0, 0); // local midnight in America/Mexico_City
  const orders = member.key === "technician" ? demoWorkOrders(request).slice(0, 5) : [];
  const tickets = ["owner", "admin"].includes(member.key)
    ? demoTickets(request).slice(member.key === "owner" ? 0 : 2, member.key === "owner" ? 2 : 5)
    : [];
  return {
    member: row(request, member),
    lastActiveOwner: member.key === "owner",
    self: member.id === demoMembershipId(request.state.persona, request.account.key),
    activity: {
      period: window,
      from: from.toISOString(),
      timeZone: "America/Mexico_City",
      maintenanceCompleted: maintenance,
      ticketsCreated: created,
      ticketsAttended: attended,
      ordersAssigned: assigned,
      recentWorkOrders: orders.map((order) => ({
        id: order.id,
        folio: order.folio,
        machine_code: order.machineCode,
        state: order.state,
        at: order.createdAt,
      })),
      recentTickets: tickets.map((ticket) => ({
        id: ticket.id,
        folio: ticket.folio,
        machine_code: ticket.machineCode,
        state: ticket.state,
        at: ticket.createdAt,
      })),
    },
  };
}
