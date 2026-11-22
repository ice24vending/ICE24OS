import type { ScheduledActivity, Ticket, WorkOrder } from "@ice24/contracts";
import type { DemoRequest } from "./api";
import { demoIds, demoUserId } from "./fixtures";
import { demoOrderDefinition } from "./work-order-fixtures";

const names = [
  "Revisar filtro de agua",
  "Limpiar condensador",
  "Revisar sello de la puerta",
  "Ajustar sensor de nivel",
  "Revisar ventilación",
  "Cambiar filtro de entrada",
  "Inspeccionar conexiones",
];
const priorities = ["critical", "high", "normal", "low"] as const;
const criticalities = ["critical", "high", "medium", "low"] as const;
const visible = (r: DemoRequest, machineId: string) => r.machines.some((m) => m.id === machineId);
const date = (r: DemoRequest, days: number) => new Date(r.now + days * 86400000).toISOString();
const ticketId = (r: DemoRequest, n: number) =>
  demoIds.request(900 + n + (r.state.account === "bajio" ? 100 : 0));
const activityId = (r: DemoRequest, n: number) =>
  demoIds.job(12000 + n + (r.state.account === "bajio" ? 100 : 0));
const orderId = (r: DemoRequest, n: number) =>
  demoIds.job(13000 + n + (r.state.account === "bajio" ? 100 : 0));

/** One dataset for every existing list/detail endpoint; counts are always derived by the UI. */
export function operationTickets(r: DemoRequest): Ticket[] {
  const states = [
    "pending_assignment",
    "pending_assignment",
    "in_progress",
    "in_progress",
    "completed",
    "completed",
    "cancelled",
    "pending_assignment",
    "in_progress",
    "in_progress",
  ] as const;
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(r.now));
  return states
    .map((state, n): Ticket => {
      const m = r.account.machines[n % r.account.machines.length]!;
      return {
        id: ticketId(r, n),
        folio: `TKT-${String(n + 1).padStart(6, "0")}`,
        machineId: m.id,
        machineCode: m.code,
        systemId: demoIds.catalog(2),
        systemName: "Refrigeración",
        componentId: demoIds.catalog(3),
        componentName: "Compresor",
        priority: priorities[n % 4]!,
        description: [
          "La producción de hielo disminuyó durante el turno de apertura.",
          "El ventilador presenta vibración al arrancar.",
          "El sensor de nivel no detecta el depósito lleno.",
          "Hay una fuga pequeña junto a la conexión de entrada.",
        ][n % 4]!,
        diagnosis: n % 2 ? "Se requiere inspección del componente y sus conexiones." : null,
        state,
        activityId: null,
        workOrderId: ["in_progress", "completed"].includes(state) ? orderId(r, n) : null,
        evidenceIds: [],
        rowVersion: 2,
        createdAt:
          n < 7
            ? new Date(
                Math.min(r.now, Date.parse(day + "T06:00:00Z") + (n + 1) * 3600000),
              ).toISOString()
            : date(r, -(n - 6)),
      };
    })
    .filter((t) => visible(r, t.machineId));
}
export function operationActivities(r: DemoRequest): ScheduledActivity[] {
  const offsets = [-8, -3, 0.2, 1, 2, 2, 3, 4, 5, 6, 7, 12, -1, -2];
  return offsets
    .map((days, n): ScheduledActivity => {
      const m = r.account.machines[n % r.account.machines.length]!;
      const state =
        n === 0
          ? "critical"
          : n === 1
            ? "overdue"
            : n === 12
              ? "completed"
              : n === 13
                ? "cancelled"
                : days > 7
                  ? "scheduled"
                  : "upcoming";
      return {
        id: activityId(r, n),
        machineId: m.id,
        branchId: m.branchId,
        machineCode: m.code,
        machineName: m.name,
        branchName: r.account.branches.find((b) => b.id === m.branchId)!.name,
        activityCode: `MNT-${n + 1}`,
        name: names[n % names.length]!,
        state,
        ...(n === 8 ? {} : { criticality: criticalities[n % 4]! }),
        dueAt: date(r, days),
        alertAt: date(r, days - 7),
        timezone: "America/Mexico_City",
        assigneeId: null,
        rowVersion: 1,
      };
    })
    .filter((a) => visible(r, a.machineId));
}
export function operationOrders(r: DemoRequest): WorkOrder[] {
  const states = [
    "overdue",
    "upcoming",
    "in_progress",
    "in_progress",
    "completed",
    "completed",
    "cancelled",
    "scheduled",
    "with_observations",
    "nonconforming",
    "corrected",
    "scheduled",
  ] as const;
  const people = [
    { id: demoUserId("technician"), name: "Ana Torres" },
    ...["Luis García", "Marisol Pérez", "Diego Hernández", "Elena Cruz", "Roberto Luna"].map(
      (name, n) => ({ id: demoIds.user(100 + n), name }),
    ),
  ];
  return states
    .map((state, n): WorkOrder => {
      const m = r.account.machines[n % r.account.machines.length]!;
      const fromTicket = (n >= 2 && n <= 6) || n === 8 || n === 9;
      const person = people[[0, 1, 0, 2, 3, 4, 0, 1, 2, 3, 4, 5][n]!]!;
      return {
        id: orderId(r, n),
        folio: `OT-${String(n + 1).padStart(6, "0")}`,
        machineId: m.id,
        machineCode: m.code,
        branchId: m.branchId,
        sourceType: fromTicket ? "ticket" : "activity",
        sourceId: fromTicket ? ticketId(r, n) : activityId(r, n),
        ticketId: fromTicket ? ticketId(r, n) : null,
        activityId: fromTicket ? null : activityId(r, n),
        assigneeId: person.id,
        assigneeName: person.name,
        templateId: demoIds.catalog(10),
        templateVersion: 1,
        definition: {
          ...demoOrderDefinition,
          name: names[n % names.length]!,
          criticality: criticalities[n % 4]!,
        },
        state,
        dueAt: date(r, [-3, 2, 0, 1, -1, -2, 3, 4, -1, -2, -1, 5][n]!),
        alertAt: date(r, -5),
        rowVersion: 1,
        createdAt: date(r, -7),
      };
    })
    .filter((o) => visible(r, o.machineId));
}
