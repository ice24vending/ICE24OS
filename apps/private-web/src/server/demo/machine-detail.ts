import { randomUUID } from "node:crypto";
import {
  machineDetailSchema,
  machineMetadataSchema,
  operationalInputSchema,
  moveInputSchema,
  transitionInputSchema,
  updateMachineComponentSchema,
  type MachineDetail,
  type MachineComponents,
  type ErrorCode,
} from "@ice24/contracts";
import type { DemoRequest } from "./api";
import { equipmentMachine, equipmentComponents } from "./equipment";
import { at, DEMO_MODELS, demoIds } from "./fixtures";

type State = {
  machine: MachineDetail;
  components: MachineComponents;
  events: { event_type: string; reason: string; occurred_at: string }[];
  receipts: Map<string, { fingerprint: string; result: unknown }>;
};
const runtime = globalThis as typeof globalThis & { ice24DemoMachineDetails?: Map<string, State> };
const sessions = (runtime.ice24DemoMachineDetails ??= new Map<string, State>());
export function machineDetailFixture(request: DemoRequest, id: string): MachineDetail | undefined {
  const machine = request.machines.find((row) => row.id === id);
  if (!machine) return undefined;
  const index = request.account.machines.findIndex((row) => row.id === id);
  const empty = request.state.scenario === "empty";
  const stamp = (days: number, reason: string) => ({
    changedAt: empty ? null : at(request.now, days),
    reason: empty ? null : reason,
  });
  return machineDetailSchema.parse({
    ...equipmentMachine(request, machine),
    branchName: request.account.branches.find((row) => row.id === machine.branchId)?.name,
    modelName: DEMO_MODELS.find((row) => row.id === machine.modelId)?.name,
    timezone: "America/Mexico_City",
    ...(empty ? { technical_status: null, sanitary_status: null, publication_status: null } : {}),
    conditionDates: {
      operational: stamp(
        -3 - index,
        [
          "Revisión terminada; equipo disponible",
          "Mantenimiento preventivo en curso",
          "Apertura del punto de venta",
          "Falla de refrigeración reportada",
        ][index % 4]!,
      ),
      technical: stamp(-7 - index * 2, "Inspección de componentes y temperatura"),
      sanitary: stamp(-2 - index, "Limpieza y revisión de depósito"),
      publication: stamp(-14 - index, "Revisión de información publicada"),
    },
  });
}
export function demoMachineDetailResponse(
  request: DemoRequest,
  route: string,
  init: RequestInit,
): Response | null {
  const match =
    /^machines\/([0-9a-f-]{36})(?:\/(status|timeline|location-history|ownership-history|components|operational-status|moves|retire)(?:\/([0-9a-f-]{36}))?)?$/.exec(
      route,
    );
  if (!match) return null;
  const method = (init.method ?? "GET").toUpperCase();
  const section = match[2];
  // Existing creation and transition commands retain their established demo behavior.
  if (
    method !== "GET" &&
    (section === "components"
      ? method !== "PATCH" || !match[3]
      : !["", "operational-status", "moves", "retire"].includes(section ?? ""))
  )
    return null;
  const fail = (status: number, code: ErrorCode, message: string) =>
    Response.json(
      {
        error: {
          code,
          message,
          correlationId: demoIds.correlation(204),
          timestamp: new Date(request.now).toISOString(),
        },
      },
      { status },
    );
  const fixture = machineDetailFixture(request, match[1]!);
  if (!fixture) return fail(404, "NOT_FOUND", "Máquina no disponible.");
  const write = method !== "GET";
  const decision = request.authorize(
    write
      ? section === "components"
        ? "equipment.machine-components-manage"
        : "equipment.manage"
      : "equipment.read",
    write ? "WRITE" : "READ",
    !write && request.subject.machineIds.has(fixture.id)
      ? { machineId: fixture.id }
      : { branchId: fixture.branch_id },
  );
  if (!decision.allowed)
    return fail(
      403,
      decision.reason === "account_read_only" ? "ACCOUNT_READ_ONLY" : "FORBIDDEN",
      "No tienes permiso para esta acción.",
    );
  if (
    write &&
    ["moves", "retire"].includes(section ?? "") &&
    request.subject.assuranceLevel !== "aal2"
  )
    return fail(403, "FORBIDDEN", "Verifica tu segundo factor.");
  const key = `${request.state.csrf}:${request.account.id}:${fixture.id}:${request.state.scenario ?? "normal"}`;
  let state = sessions.get(key);
  if (!state) {
    if (sessions.size >= 200) sessions.delete(sessions.keys().next().value!);
    state = {
      machine: fixture,
      components: equipmentComponents(
        request,
        request.machines.find((row) => row.id === fixture.id)!,
      ),
      events:
        request.state.scenario === "empty"
          ? []
          : [
              {
                event_type: "MACHINE_OPERATIONAL_STATUS",
                reason: fixture.conditionDates!.operational.reason!,
                occurred_at: fixture.conditionDates!.operational.changedAt!,
              },
              {
                event_type: "MACHINE_COMPONENT_ADDED",
                reason: "Sustitución del filtro de sedimentos",
                occurred_at: at(request.now, -12),
              },
              {
                event_type: "MACHINE_APPROVED",
                reason: "Instalación y pruebas de funcionamiento",
                occurred_at: fixture.installed_at!,
              },
            ],
      receipts: new Map(),
    };
    sessions.set(key, state);
  }
  if (!write) {
    if (section === "components") return Response.json(state.components);
    if (section === "timeline") return Response.json(state.events);
    if (section === "location-history" || section === "ownership-history")
      return Response.json(
        request.state.scenario === "empty"
          ? []
          : [
              {
                kind: section === "location-history" ? "location" : "ownership",
                valid_from: at(request.now, -190),
                valid_to: at(request.now, -60),
              },
              {
                kind: section === "location-history" ? "location" : "ownership",
                valid_from: at(request.now, -60),
                valid_to: null,
              },
            ],
      );
    return Response.json(state.machine);
  }
  const headers = new Headers(init.headers);
  const receiptKey = headers.get("idempotency-key");
  if (!receiptKey) return fail(400, "VALIDATION_FAILED", "Falta clave de idempotencia.");
  const fingerprint = `${method}:${route}:${String(init.body)}`;
  const previous = state.receipts.get(receiptKey);
  if (previous)
    return previous.fingerprint === fingerprint
      ? Response.json(previous.result)
      : fail(409, "CONFLICT", "La solicitud ya fue utilizada.");
  let body: unknown;
  try {
    body = JSON.parse(String(init.body));
  } catch {
    return fail(400, "VALIDATION_FAILED", "Datos inválidos.");
  }
  const component =
    section === "components"
      ? state.components.current.find((row) => row.componentCatalogId === match[3])
      : undefined;
  if (section === "components" && !component)
    return fail(404, "NOT_FOUND", "Componente no disponible.");
  const version = headers.get("if-match")?.replace(/^W\//, "").replaceAll('"', "");
  if (!version) return fail(400, "VALIDATION_FAILED", "Falta versión.");
  if (
    Number(version) !== (component?.version ?? state.machine.row_version) ||
    request.state.scenario === "conflict"
  )
    return fail(412, "PRECONDITION_FAILED", "El registro cambió.");
  if (state.machine.operational_status === "retired")
    return fail(409, "CONFLICT", "La máquina fue retirada.");
  const now = new Date(request.now).toISOString();
  let result: unknown;
  if (component) {
    const parsed = updateMachineComponentSchema.safeParse(body);
    if (!parsed.success) return fail(400, "VALIDATION_FAILED", "Revisa los datos del componente.");
    const changed = {
      ...component,
      ...parsed.data,
      id: randomUUID(),
      version: component.version + 1,
      validFrom: now,
    };
    state.components = {
      ...state.components,
      current: state.components.current.map((row) => (row.id === component.id ? changed : row)),
      history: [
        ...state.components.history.map((row) =>
          row.id === component.id ? { ...row, validTo: now } : row,
        ),
        changed,
      ],
    };
    state.events.unshift({
      event_type: "MACHINE_COMPONENT_UPDATED",
      reason: parsed.data.reason,
      occurred_at: now,
    });
    result = changed;
  } else {
    const parsed = (
      section === "operational-status"
        ? operationalInputSchema
        : section === "moves"
          ? moveInputSchema
          : section === "retire"
            ? transitionInputSchema
            : machineMetadataSchema
    ).safeParse(body);
    if (!parsed.success) return fail(400, "VALIDATION_FAILED", "Revisa los datos de la máquina.");
    const value = parsed.data;
    if ("internalName" in value) state.machine.data = { ...state.machine.data, ...value };
    else if ("toBranchId" in value) {
      const branch = request.account.branches.find(
        (row) => row.id === value.toBranchId && row.id !== state!.machine.branch_id,
      );
      if (!branch) return fail(409, "CONFLICT", "Elige otra sucursal.");
      state.machine.branch_id = branch.id;
      state.machine.branchName = branch.name;
    } else {
      state.machine.operational_status =
        section === "operational-status" ? operationalInputSchema.parse(body).status : "retired";
      state.machine.conditionDates!.operational = { changedAt: now, reason: value.reason };
    }
    state.machine.row_version++;
    state.events.unshift({
      event_type:
        section === "operational-status"
          ? "MACHINE_OPERATIONAL_STATUS"
          : section === "moves"
            ? "MACHINE_MOVES"
            : section === "retire"
              ? "MACHINE_RETIRE"
              : "MACHINE_METADATA",
      reason: "reason" in value ? value.reason : "Nombre o marca actualizados",
      occurred_at: now,
    });
    result = state.machine;
  }
  state.receipts.set(receiptKey, { fingerprint, result: structuredClone(result) });
  return Response.json(result);
}
