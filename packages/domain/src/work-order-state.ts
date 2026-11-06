/** AppFlow §15. All consumers use this table; elapsed time never erases overdue history. */
export const workOrderStates = [
  "scheduled",
  "upcoming",
  "overdue",
  "in_progress",
  "completed",
  "with_observations",
  "nonconforming",
  "corrected",
  "cancelled",
] as const;
export type WorkOrderState = (typeof workOrderStates)[number];
export const workOrderTransitions = [
  {
    from: "scheduled",
    to: "upcoming",
    action: "notify",
    label: "Ventana de aviso",
    guard: "notice",
  },
  {
    from: "scheduled",
    to: "overdue",
    action: "expire",
    label: "Superar fecha límite",
    guard: "due",
  },
  {
    from: "upcoming",
    to: "overdue",
    action: "expire",
    label: "Superar fecha límite",
    guard: "due",
  },
  { from: "scheduled", to: "in_progress", action: "start", label: "Iniciar", guard: "assignee" },
  { from: "upcoming", to: "in_progress", action: "start", label: "Iniciar", guard: "assignee" },
  {
    from: "overdue",
    to: "in_progress",
    action: "start",
    label: "Ejecución real",
    guard: "assignee",
  },
  {
    from: "in_progress",
    to: "completed",
    action: "complete",
    label: "Cierre conforme",
    guard: "closure",
  },
  {
    from: "in_progress",
    to: "with_observations",
    action: "observe",
    label: "Cierre con seguimiento",
    guard: "followup",
  },
  {
    from: "in_progress",
    to: "nonconforming",
    action: "reject",
    label: "Resultado fuera de criterio",
    guard: "nonconforming",
  },
  {
    from: "completed",
    to: "corrected",
    action: "correct",
    label: "Corrección versionada",
    guard: "correction",
  },
  {
    from: "with_observations",
    to: "corrected",
    action: "correct",
    label: "Corrección versionada",
    guard: "correction",
  },
  {
    from: "nonconforming",
    to: "corrected",
    action: "correct",
    label: "Acción válida",
    guard: "correction",
  },
  {
    from: "completed",
    to: "cancelled",
    action: "cancel",
    label: "Motivo autorizado",
    guard: "cancellation",
  },
  {
    from: "completed",
    to: "in_progress",
    action: "reopen",
    label: "Reapertura autorizada",
    guard: "reopening",
  },
  {
    from: "with_observations",
    to: "in_progress",
    action: "reopen",
    label: "Reapertura autorizada",
    guard: "reopening",
  },
  {
    from: "nonconforming",
    to: "in_progress",
    action: "reopen",
    label: "Reapertura autorizada",
    guard: "reopening",
  },
  {
    from: "corrected",
    to: "in_progress",
    action: "reopen",
    label: "Reapertura autorizada",
    guard: "reopening",
  },
] as const;
export type WorkOrderAction = (typeof workOrderTransitions)[number]["action"];
export interface WorkOrderFacts {
  state: WorkOrderState;
  version: number;
  expectedVersion: number;
  permitted: boolean;
  assignedToActor: boolean;
  assigneeActive: boolean;
  now: number;
  alertAt: number | null;
  dueAt: number | null;
  reason: string;
  /** Trusted execution/review facts, never accepted from a transition request. */
  executionComplete: boolean;
  evidenceComplete: boolean;
  result: "conforming" | "observations" | "nonconforming" | null;
  followupRecorded: boolean;
  correctionRecorded: boolean;
  cancellationRecorded: boolean;
  reopeningRecorded: boolean;
}
export function evaluateWorkOrderTransition(
  action: WorkOrderAction,
  facts: WorkOrderFacts,
):
  | { allowed: true; state: WorkOrderState }
  | { allowed: false; code: "FORBIDDEN" | "CONFLICT"; message: string } {
  const deny = (message: string) => ({
    allowed: false as const,
    code: "CONFLICT" as const,
    message,
  });
  if (!facts.permitted)
    return { allowed: false, code: "FORBIDDEN", message: "No tienes permiso para esta acción." };
  if (facts.version !== facts.expectedVersion)
    return deny("La orden cambió. Recarga antes de continuar.");
  const transition = workOrderTransitions.find(
    (t) => t.from === facts.state && t.action === action,
  );
  if (!transition) return deny("La transición no está permitida desde el estado actual.");
  if (
    ["observe", "reject", "correct", "cancel", "reopen"].includes(action) &&
    facts.reason.trim().length < 5
  )
    return deny("Explica el motivo con al menos 5 caracteres.");
  switch (transition.guard) {
    case "notice":
      if (
        facts.alertAt === null ||
        facts.now < facts.alertAt ||
        (facts.dueAt !== null && facts.now >= facts.dueAt)
      )
        return deny("La orden no está en su ventana de aviso.");
      break;
    case "due":
      if (facts.dueAt === null || facts.now < facts.dueAt)
        return deny("La fecha límite aún no se supera.");
      break;
    case "assignee":
      if (!facts.assignedToActor || !facts.assigneeActive)
        return deny("Solo el técnico responsable con acceso vigente puede iniciar.");
      break;
    case "closure":
    case "followup":
    case "nonconforming":
      if (
        !facts.assignedToActor ||
        !facts.assigneeActive ||
        !facts.executionComplete ||
        !facts.evidenceComplete
      )
        return deny("Falta completar la ejecución y su evidencia requerida.");
      if (
        facts.result !==
        ({ complete: "conforming", observe: "observations", reject: "nonconforming" } as const)[
          action as "complete" | "observe" | "reject"
        ]
      )
        return deny("El resultado no corresponde al cierre solicitado.");
      if (transition.guard !== "closure" && !facts.followupRecorded)
        return deny("Falta registrar el seguimiento.");
      break;
    case "correction":
      if (!facts.correctionRecorded) return deny("Falta la corrección versionada y validada.");
      break;
    case "reopening":
      if (!facts.reopeningRecorded) return deny("Falta la revisión de reapertura autorizada.");
      break;
    case "cancellation":
      if (!facts.cancellationRecorded) return deny("Falta la revisión de anulación autorizada.");
  }
  return { allowed: true, state: transition.to };
}
export function workOrderStateDiagram() {
  return [
    "stateDiagram-v2",
    "    [*] --> scheduled",
    ...workOrderTransitions.map((t) => `    ${t.from} --> ${t.to}: ${t.label}`),
  ].join("\n");
}
