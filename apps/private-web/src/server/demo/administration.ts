import type { DemoRequest } from "./api";
import { DEMO_ACCOUNTS, DEMO_MODELS, at, demoIds } from "./fixtures";
import { equipmentAccount, equipmentCatalog } from "./equipment";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
const failure = (request: DemoRequest, status: number) =>
  json(
    {
      error: {
        code: status === 403 ? "FORBIDDEN" : "NOT_FOUND",
        message: "Registro no disponible",
        correlationId: demoIds.correlation(999),
        timestamp: new Date(request.now).toISOString(),
      },
    },
    status,
  );
export function administrationCatalog(request: DemoRequest) {
  return [
    ...equipmentCatalog(request),
    {
      id: demoIds.catalog(101),
      kind: "system",
      code: "REFRIGERACION",
      data: { name: "Refrigeración" },
      status: "active",
      row_version: 1,
    },
    {
      id: demoIds.catalog(102),
      kind: "system",
      code: "PURIFICACION",
      data: { name: "Purificación de agua" },
      status: "active",
      row_version: 1,
    },
    {
      id: demoIds.catalog(103),
      kind: "manufacturer",
      code: "ICE24",
      data: { name: "ICE24" },
      status: "active",
      row_version: 1,
    },
  ];
}
export function administrationAccounts(request: DemoRequest) {
  if (request.state.scenario === "empty") return [];
  const base = equipmentAccount(request);
  return [
    {
      ...base,
      id: DEMO_ACCOUNTS.polar.id,
      account_id: DEMO_ACCOUNTS.polar.id,
      name: DEMO_ACCOUNTS.polar.name,
      access_mode: "ACTIVE",
    },
    {
      ...base,
      id: DEMO_ACCOUNTS.bajio.id,
      account_id: DEMO_ACCOUNTS.bajio.id,
      name: DEMO_ACCOUNTS.bajio.name,
      access_mode: "READ_ONLY",
      row_version: 6,
    },
    {
      ...base,
      id: demoIds.account(3),
      account_id: demoIds.account(3),
      name: "Hielo del Pacífico",
      access_mode: "SUSPENDED",
      row_version: 2,
    },
    {
      ...base,
      id: demoIds.account(4),
      account_id: demoIds.account(4),
      name: "Purificadora La Estación",
      account_type: "INDIVIDUAL",
      access_mode: "ACTIVE",
      row_version: 1,
    },
  ].map((row, index) => ({
    ...row,
    details: {
      ...row.details,
      displayName: row.name,
      legalName: row.name,
      contact: { email: `operacion${index + 1}@demo.invalid`, phone: `+52 81 5550 120${index}` },
    },
  }));
}
export function administrationRequests(request: DemoRequest) {
  if (request.state.scenario === "empty") return [];
  return ["submitted", "in_review", "information_required", "active", "rejected"].map(
    (status, index) => ({
      id: demoIds.request(index + 1),
      row_version: index + 1,
      status,
      folio: `ALT-2026-${String(index + 41).padStart(4, "0")}`,
      account_id: index % 2 ? DEMO_ACCOUNTS.bajio.id : DEMO_ACCOUNTS.polar.id,
      branch_id: DEMO_ACCOUNTS.polar.branches[index % 2]!.id,
      created_at: at(request.now, -index - 1),
      data: {
        name: [
          "Despachadora San Pedro",
          "Purificadora Centro León",
          "Fábrica Cumbres",
          "Despachadora Alameda",
          "Equipo sin placa legible",
        ][index],
        modelName: DEMO_MODELS[index % 3]!.name,
        serialNumber: `MX-${2024 + (index % 3)}-${500 + index}`,
        fileIds: [],
      },
    }),
  );
}
export function administrationTemplates(request: DemoRequest, modelId: string) {
  if (request.state.scenario === "empty" || !DEMO_MODELS.some((model) => model.id === modelId))
    return [];
  const modelIndex = DEMO_MODELS.findIndex((model) => model.id === modelId);
  const catalog = administrationCatalog(request);
  return ["draft", "published", "superseded"].map((status, index) => ({
    id: demoIds.template(modelIndex * 10 + index + 1),
    row_version: 4 - index,
    model_id: modelId,
    version_number: 3 - index,
    status,
    created_at: at(request.now, -index * 30 - 5),
    definition: {
      changeSummary: [
        "Actualizar la revisión de filtros y sanitización",
        "Programa mensual aprobado para operación",
        "Programa anterior de mantenimiento",
      ][index],
      systems: catalog.filter((item) => item.kind === "system").map((item) => item.id),
      components: catalog.filter((item) => item.kind === "component").map((item) => item.id),
      activities: [
        {
          code: "REV_FILTRO",
          name:
            modelIndex === 2 ? "Cambiar cartucho de purificación" : "Revisar filtro y serpentín",
          category: "maintenance",
          frequencyDays: 30,
          triggerType: "time",
          triggerDescription: "Revisión mensual",
          responsibleRole: "TC",
          checklist: [{ code: "CHECK_1", label: "Filtro sin obstrucciones", required: true }],
          fields: [],
          evidenceRules: { required: true, minimumFiles: 1 },
          escalationRules: { afterHours: 24, notifyRole: "OW" },
          criticality: "medium",
        },
      ],
    },
  }));
}
/** Existing administrative API reads, with their real authorization and database field names. */
export function demoAdministrationResponse(request: DemoRequest, path: string): Response | null {
  if (path === "catalogs" && request.can("equipment.admin"))
    return json(administrationCatalog(request));
  const admin =
    /^admin\/(?:accounts(?:\/[0-9a-f-]{36})?|equipment-requests|dashboard|template-versions\/[0-9a-f-]{36}\/impact)$/.test(
      path,
    );
  const template = /^template-versions\/([0-9a-f-]{36})$/.exec(path);
  const versions = /^technical-models\/([0-9a-f-]{36})\/template-versions$/.exec(path);
  if (!admin && !template && !versions) return null;
  if (!request.can(admin ? "equipment.admin" : "equipment.read")) return failure(request, 403);
  if (path === "admin/accounts") return json(administrationAccounts(request));
  if (path.startsWith("admin/accounts/")) {
    const row = administrationAccounts(request).find((item) => item.id === path.split("/")[2]);
    return row ? json(row) : failure(request, 404);
  }
  if (path === "admin/equipment-requests") return json(administrationRequests(request));
  if (path === "admin/dashboard")
    return json({
      accounts: administrationAccounts(request).length,
      pending_requests: administrationRequests(request).filter((row) =>
        ["submitted", "in_review", "information_required"].includes(row.status),
      ).length,
      machines: request.state.scenario === "empty" ? 0 : 12,
      draft_templates: request.state.scenario === "empty" ? 0 : 3,
      failed_jobs: request.state.scenario === "empty" ? 0 : 1,
    });
  if (versions)
    return DEMO_MODELS.some((model) => model.id === versions[1])
      ? json(administrationTemplates(request, versions[1]!))
      : failure(request, 404);
  const id = template?.[1] ?? path.split("/")[2];
  const row = DEMO_MODELS.flatMap((model) => administrationTemplates(request, model.id)).find(
    (item) => item.id === id,
  );
  if (!row) return failure(request, 404);
  return json(template ? row : { machines: 4, future_activities: 18 });
}
