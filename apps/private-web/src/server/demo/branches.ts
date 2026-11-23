import { randomUUID } from "node:crypto";
import {
  branchInputSchema,
  branchUpdateSchema,
  type BranchOverview,
  type BranchInput,
  type ErrorCode,
} from "@ice24/contracts";
import type { DemoRequest } from "./api";
import { demoIds } from "./fixtures";

type Session = {
  rows: BranchOverview[];
  receipts: Map<string, { fingerprint: string; row: BranchOverview }>;
  audit: { operation: string; id: string; before?: BranchInput; after: BranchInput }[];
};
const runtime = globalThis as typeof globalThis & { ice24DemoBranches?: Map<string, Session> };
const sessions = (runtime.ice24DemoBranches ??= new Map<string, Session>());

function fixtures(request: DemoRequest): BranchOverview[] {
  const polar = request.account.key === "polar";
  return [
    ...request.account.branches.map((branch, i) => ({
      ...branch,
      code: i ? "CUMBRES" : "CENTRO",
      city: polar ? "Monterrey" : i ? "Irapuato" : "León",
      state: polar ? "Nuevo León" : "Guanajuato",
      archived: false,
    })),
    {
      id: demoIds.branch(polar ? 201 : 203),
      name: polar ? "Punto San Nicolás" : "Punto Silao",
      address: "Av. Universidad 820, local 3",
      code: "PUNTO-03",
      city: polar ? "San Nicolás de los Garza" : "Silao",
      state: polar ? "Nuevo León" : "Guanajuato",
      archived: false,
    },
    {
      id: demoIds.branch(polar ? 202 : 204),
      name: "Bodega anterior",
      address: "Calle Reforma 48",
      code: "BODEGA-01",
      city: polar ? "Guadalupe" : "León",
      state: polar ? "Nuevo León" : "Guanajuato",
      archived: true,
    },
  ].map((branch, i) => ({
    id: branch.id,
    account_id: request.account.id,
    row_version: i + 1,
    status: branch.archived ? "archived" : "active",
    data: {
      name: branch.name,
      code: branch.code,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      notes: [
        "Acceso de servicio por la calle lateral. Avisar antes de llegar.",
        "Revisar el filtro del equipo de agua en la siguiente visita.",
        "Pendiente de instalar la primera máquina.",
        "Operación trasladada a la sucursal Centro.",
      ][i]!,
      latitude: 25.6866 + i * 0.02,
      longitude: -100.3161 - i * 0.03,
      timezone: "America/Mexico_City",
      schedule: i === 1 ? "Todos los días, 07:00 a 22:00" : "Lunes a sábado, 08:00 a 18:00",
      publicPhone: i < 2 ? `81 5550 12${String(i).padStart(2, "0")}` : "",
      ownerPhonePublic: false,
      referenceTemperature: i < 2 ? -8 : null,
    },
    machineCounts: request.account.machines
      .filter((m) => m.branchId === branch.id)
      .reduce<Record<string, number>>((counts, m) => {
        counts[m.status] = (counts[m.status] ?? 0) + 1;
        return counts;
      }, {}),
    responsible: i === 0 ? "Jorge Salinas" : i === 1 ? "Mariana Ríos" : "Sin responsable asignado",
  }));
}
function session(request: DemoRequest) {
  const key = `${request.state.csrf}:${request.account.id}`;
  let value = sessions.get(key);
  if (!value) {
    // Bounded, fictional, per-browser state. It never writes to production or global fixtures.
    if (sessions.size >= 200) sessions.delete(sessions.keys().next().value!);
    value = { rows: fixtures(request), receipts: new Map(), audit: [] };
    sessions.set(key, value);
  }
  return value;
}
export const demoBranchAudit = (request: DemoRequest) => session(request).audit;

export function demoBranchesResponse(
  request: DemoRequest,
  route: string,
  init: RequestInit,
): Response {
  const method = (init.method ?? "GET").toUpperCase();
  const fail = (
    status: number,
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) =>
    Response.json(
      {
        error: {
          code,
          message,
          details,
          correlationId: demoIds.correlation(202),
          timestamp: new Date(request.now).toISOString(),
        },
      },
      { status },
    );
  const write = method !== "GET";
  const decision = request.authorize(
    write ? "equipment.manage" : "equipment.read",
    write ? "WRITE" : "READ",
  );
  if (!decision.allowed)
    return fail(
      403,
      request.state.mode === "READ_ONLY" ? "ACCOUNT_READ_ONLY" : "FORBIDDEN",
      "No tienes permiso para realizar esta acción.",
    );
  const store = session(request);
  const parts = route.split("/");
  const id = parts[1] === "overview" ? undefined : parts[1];
  const inScope = (row: BranchOverview) =>
    request.subject.accountWide || request.subject.branchIds.has(row.id);
  const current = store.rows.find((row) => row.id === id && inScope(row));
  if (id && !current) return fail(404, "NOT_FOUND", "Sucursal no disponible.");
  const visible = (row: BranchOverview) => ({
    ...row,
    responsible:
      request.subject.accountWide || row.responsible === "Sin responsable asignado"
        ? row.responsible
        : "Asignado",
  });
  if (!write) {
    if (!id)
      return Response.json(
        request.state.scenario === "empty" ? [] : store.rows.filter(inScope).map(visible),
      );
    if (parts[2] !== "overview") return Response.json(visible(current!));
    return Response.json({
      branch: visible(current!),
      machines:
        request.state.scenario === "empty"
          ? []
          : request.machines
              .filter((m) => m.branchId === id)
              .map((m) => ({
                id: m.id,
                machine_code: m.code,
                internal_name: m.name,
                operational_status: m.status,
              })),
    });
  }
  if (!id && !request.subject.accountWide)
    return fail(403, "FORBIDDEN", "No puedes crear sucursales.");
  const headers = new Headers(init.headers);
  const key = headers.get("idempotency-key");
  if (!key) return fail(400, "VALIDATION_FAILED", "Falta la clave de la solicitud.");
  let input: unknown;
  try {
    input = JSON.parse(String(init.body));
  } catch {
    return fail(400, "VALIDATION_FAILED", "Revisa los campos.");
  }
  const fingerprint = JSON.stringify([route, method, input, headers.get("if-match")]);
  const receiptKey = `${request.subject.userId}:${key}`;
  const receipt = store.receipts.get(receiptKey);
  if (receipt)
    return receipt.fingerprint === fingerprint
      ? Response.json(visible(receipt.row))
      : fail(409, "IDEMPOTENCY_CONFLICT", "La solicitud cambió.");
  if (
    id &&
    (request.state.scenario === "conflict" ||
      Number(headers.get("if-match")?.replace(/^W\//, "").replaceAll('"', "")) !==
        current!.row_version)
  )
    return fail(409, "CONFLICT", "Otra persona cambió la sucursal.");
  const parsed = (id ? branchUpdateSchema : branchInputSchema).safeParse(input);
  if (!parsed.success) return fail(400, "VALIDATION_FAILED", "Revisa los campos de la sucursal.");
  const data = branchInputSchema.parse({ ...current?.data, ...parsed.data });
  if (
    data.code &&
    store.rows.some(
      (row) => row.id !== id && row.data.code?.toUpperCase() === data.code!.toUpperCase(),
    )
  )
    return fail(
      400,
      "VALIDATION_FAILED",
      "Ya existe una sucursal con este código en la cuenta. Usa otro código.",
      { field: "code", reason: "duplicate" },
    );
  const row: BranchOverview = {
    id: id ?? randomUUID(),
    account_id: request.account.id,
    row_version: (current?.row_version ?? 0) + 1,
    status: current?.status ?? "active",
    data,
    machineCounts: current?.machineCounts ?? {},
    responsible: current?.responsible ?? "Sin responsable asignado",
  };
  store.rows = current
    ? store.rows.map((item) => (item.id === id ? row : item))
    : [...store.rows, row];
  store.receipts.set(receiptKey, { fingerprint, row });
  store.audit.push({
    operation: id ? "BRANCH_UPDATED" : "BRANCH_CREATED",
    id: row.id,
    ...(current ? { before: current.data } : {}),
    after: data,
  });
  return Response.json(visible(row), { status: id ? 200 : 201 });
}
