/** UXD-00B: equipment fixtures shaped like the stores in apps/api, with stable IDs and dates. */
import type {
  AccountCatalogEntry,
  ActivityDefinition,
  EffectiveFrequency,
  FrequencyOverride,
  MachineComponents,
  MachineFrequencies,
  ModelFrequencies,
  ModelFrequency,
} from "@ice24/contracts";
import type { DemoRequest } from "./api";
import { DEMO_ACCOUNTS, DEMO_MODELS, at, demoIds, demoUserId, type DemoMachine } from "./fixtures";

const indexOf = (machine: DemoMachine) => Number.parseInt(machine.id.slice(-12), 16);
const accountIndex = (request: DemoRequest) => (request.account.key === "polar" ? 1 : 2);
const empty = (request: DemoRequest) => request.state.scenario === "empty";

export function equipmentAccount(request: DemoRequest) {
  const polar = request.account.key === "polar";
  return {
    id: request.account.id,
    account_id: request.account.id,
    name: request.account.name,
    account_type: "COMPANY",
    access_mode: request.state.mode,
    row_version: 3,
    created_at: at(request.now, polar ? -420 : -28),
    updated_at: at(request.now, -5),
    archived_at: null,
    details: {
      displayName: request.account.name,
      legalName: polar
        ? "Hielo Polar del Norte, S.A. de C.V."
        : "Agua y Hielo del Bajío, S. de R.L. de C.V.",
      timezone: "America/Mexico_City",
      currency: "MXN",
      contact: {
        email: polar ? "contacto@polar.demo.invalid" : "administracion@bajio.demo.invalid",
        phone: polar ? "+52 81 5550 1200" : "+52 477 555 0300",
      },
      taxProfile: {
        taxId: polar ? "HPN240115AB1" : "AHB250210CD2",
        fiscalAddress: polar
          ? "Av. Juárez 1200, Centro, C.P. 64000, Monterrey, Nuevo León, México"
          : "Blvd. Adolfo López Mateos 300, Centro, C.P. 37000, León, Guanajuato, México",
      },
      moduleConfiguration: {
        maintenance: true,
        sanitation: true,
        inventory: polar,
        commercial: !polar,
      },
    },
  };
}

export function equipmentMachine(request: DemoRequest, machine: DemoMachine) {
  const index = indexOf(machine);
  return {
    id: machine.id,
    account_id: request.account.id,
    branch_id: machine.branchId,
    machine_code: machine.code,
    request_id: demoIds.request(100 + index),
    model_id: machine.modelId,
    template_id: demoIds.template(
      DEMO_MODELS.findIndex((model) => model.id === machine.modelId) + 1,
    ),
    operational_status: machine.status,
    technical_status:
      machine.status === "out_of_service"
        ? "critical"
        : machine.status === "maintenance"
          ? "attention_required"
          : index % 3 === 0
            ? "preventive_attention"
            : "optimal",
    sanitary_status: ["up_to_date", "expiring_soon", "attention_required", "corrective_action"][
      (index - 1) % 4
    ],
    publication_status:
      machine.status === "available"
        ? "published"
        : machine.status === "off"
          ? "private"
          : "withdrawn",
    data: {
      internalName: machine.name,
      commercialBrand: request.account.name,
      serialNumber: `DEMO-${index.toString().padStart(4, "0")}`,
    },
    installed_at: at(request.now, -180 - index * 9),
    created_at: at(request.now, -190 - index * 9),
    updated_at: at(request.now, -index, -2),
    row_version: 3,
  };
}

const OFFICIAL_COMPONENTS = [
  { code: "COMPRESOR", name: "Compresor" },
  { code: "CONDENSADOR", name: "Condensador" },
  { code: "DEPOSITO_HIELO", name: "Depósito de hielo" },
  { code: "FILTRO_AGUA", name: "Filtro de agua" },
  { code: "LAMPARA_UV", name: "Lámpara UV" },
];

export function equipmentAccountCatalog(request: DemoRequest): AccountCatalogEntry[] {
  if (empty(request)) return [];
  const base = accountIndex(request) * 100;
  return [
    {
      id: demoIds.catalog(base + 1),
      scope: "ACCOUNT",
      kind: "component",
      code: "PREFILTRO_20",
      name: "Prefiltro de sedimentos de 20 pulgadas",
      description: "Etapa adicional para agua con alta carga de sedimentos.",
      unit: "pieza",
      maintenanceActivity: {
        code: "CAMBIO_PREFILTRO",
        name: "Cambiar cartucho del prefiltro",
        category: "maintenance",
        defaultFrequency: { value: 3, unit: "months" },
        checklist: [
          { code: "REEMPLAZO", label: "Cerrar suministro y sustituir el cartucho", required: true },
        ],
        evidenceRules: { required: true, minimumFiles: 1 },
      },
      status: "active",
      version: 2,
      createdAt: at(request.now, -120),
      updatedAt: at(request.now, -18),
    },
    {
      id: demoIds.catalog(base + 2),
      scope: "ACCOUNT",
      kind: "component",
      code: "UV_40W",
      name: "Lámpara ultravioleta de 40 W",
      description: "Desinfección complementaria en el depósito.",
      unit: "pieza",
      maintenanceActivity: {
        code: "REVISION_UV",
        name: "Revisar intensidad de lámpara ultravioleta",
        category: "inspection",
        defaultFrequency: { value: 4, unit: "weeks" },
        checklist: [
          { code: "INTENSIDAD", label: "Verificar indicador y registrar lectura", required: true },
        ],
        evidenceRules: { required: false, minimumFiles: 0 },
      },
      status: "active",
      version: 1,
      createdAt: at(request.now, -75),
      updatedAt: at(request.now, -75),
    },
    {
      id: demoIds.catalog(base + 3),
      scope: "ACCOUNT",
      kind: "characteristic",
      code: "DUREZA_AGUA",
      name: "Dureza del agua de entrada",
      description: "Referencia para ajustar la frecuencia del prefiltro.",
      unit: "ppm",
      maintenanceActivity: null,
      status: "active",
      version: 1,
      createdAt: at(request.now, -40),
      updatedAt: at(request.now, -40),
    },
  ];
}

/** GET catalogs returns database rows, unlike the typed account-catalog-entries page. */
export function equipmentCatalog(request: DemoRequest) {
  return [
    ...OFFICIAL_COMPONENTS.map((component, index) => ({
      id: demoIds.catalog(index + 1),
      kind: "component",
      code: component.code,
      data: { name: component.name },
      status: "active",
      row_version: 1,
      scope: "OFFICIAL",
    })),
    ...equipmentAccountCatalog(request).map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      code: entry.code,
      scope: entry.scope,
      status: entry.status,
      row_version: entry.version,
      data: {
        name: entry.name,
        description: entry.description,
        unit: entry.unit,
        ...(entry.maintenanceActivity ? { maintenanceActivity: entry.maintenanceActivity } : {}),
      },
    })),
  ];
}

export function equipmentComponents(request: DemoRequest, machine: DemoMachine): MachineComponents {
  if (empty(request)) return { machineId: machine.id, current: [], history: [] };
  const index = indexOf(machine);
  const own = equipmentAccountCatalog(request)[index % 2]!;
  const official = machine.modelId === demoIds.model(3) ? 3 : 0;
  const current: MachineComponents["current"] = [
    {
      id: demoIds.component(index * 10 + 1),
      machineId: machine.id,
      componentCatalogId: demoIds.catalog(official + 1),
      component: { ...OFFICIAL_COMPONENTS[official]!, scope: "OFFICIAL", status: "active" },
      origin: "TEMPLATE_DEFAULT",
      status: "active",
      validFrom: at(request.now, -180 - index * 9),
      validTo: null,
      actorId: demoUserId("platform"),
      reason: "Configuración de fábrica al activar la máquina",
      version: 1,
      model: index % 2 ? "Scroll ZB-24" : "Hermético NT-18",
      installedOn: at(request.now, -180 - index * 9).slice(0, 10),
      warrantyUntil: at(request.now, index % 2 ? 90 : -14).slice(0, 10),
    },
    {
      id: demoIds.component(index * 10 + 2),
      machineId: machine.id,
      componentCatalogId: demoIds.catalog(5),
      component: { ...OFFICIAL_COMPONENTS[4]!, scope: "OFFICIAL", status: "active" },
      origin: "TEMPLATE_OPTIONAL",
      status: index % 3 === 0 ? "inactive" : "active",
      validFrom: at(request.now, -45 - index),
      validTo: null,
      actorId: demoUserId("owner"),
      reason: "Revisión del módulo opcional de desinfección",
      version: 2,
      model: "UV-40",
      installedOn: at(request.now, -45 - index).slice(0, 10),
      warrantyUntil: at(request.now, 320 - index).slice(0, 10),
    },
    {
      id: demoIds.component(index * 10 + 3),
      machineId: machine.id,
      componentCatalogId: own.id,
      component: { code: own.code, name: own.name, scope: "ACCOUNT", status: "active" },
      origin: "ACCOUNT_CUSTOM",
      status: "active",
      validFrom: at(request.now, -12 - index),
      validTo: null,
      actorId: demoUserId("owner"),
      reason: "Configuración adicional para las condiciones del agua de la sucursal",
      version: 1,
      model: null,
      installedOn: null,
      warrantyUntil: null,
    },
  ];
  const previous = {
    ...current[1]!,
    id: demoIds.component(index * 10 + 4),
    version: 1,
    status: "inactive" as const,
    validFrom: at(request.now, -80),
    validTo: current[1]!.validFrom,
    reason: "Módulo opcional pendiente de revisión",
  };
  return {
    machineId: machine.id,
    current,
    history: [current[0]!, previous, current[1]!, current[2]!],
  };
}

const ACTIVITIES = [
  { code: "LIMPIAR_DEPOSITO", name: "Sanitizar depósito de agua", type: "SANITATION", days: 7 },
  { code: "REVISAR_FILTRO", name: "Revisar filtro de agua", type: "MAINTENANCE", days: 30 },
  { code: "LIMPIAR_CONDENSADOR", name: "Limpiar condensador", type: "MAINTENANCE", days: 60 },
] as const;

export function equipmentAccountFrequencies(request: DemoRequest) {
  const current: FrequencyOverride[] = empty(request)
    ? []
    : [
        {
          id: demoIds.frequency(accountIndex(request) * 100),
          scope: "ACCOUNT",
          machineId: null,
          componentCatalogId: null,
          activityCode: ACTIVITIES[0].code,
          activityType: "SANITATION",
          frequency: { value: request.account.key === "polar" ? 5 : 6, unit: "days" },
          alertLead: { value: 1, unit: "days" },
          factoryFrequencies: [{ value: 7, unit: "days" }],
          warrantyWarningAcknowledgedAt: at(request.now, -30),
          validFrom: at(request.now, -30),
          validTo: null,
          actorId: demoUserId("owner"),
          reason: "Mayor frecuencia sanitaria por demanda de la temporada",
          version: 2,
        },
      ];
  return { current };
}

export function equipmentFrequencies(
  request: DemoRequest,
  machine: DemoMachine,
): MachineFrequencies {
  if (empty(request)) return { machineId: machine.id, items: [] };
  const index = indexOf(machine);
  const items: EffectiveFrequency[] = ACTIVITIES.filter(
    (activity) => machine.modelId !== demoIds.model(3) || activity.code !== "LIMPIAR_CONDENSADOR",
  ).map((activity, i) => {
    const factory = {
      frequency: { value: activity.days, unit: "days" as const },
      alertLead: { value: i + 1, unit: "days" as const },
    };
    const accountOverride =
      equipmentAccountFrequencies(request).current.find(
        (override) => override.activityCode === activity.code,
      ) ?? null;
    const machineOverride: FrequencyOverride | null =
      i === 1 && index % 2 === 1
        ? {
            id: demoIds.frequency(1000 + index),
            scope: "MACHINE",
            machineId: machine.id,
            componentCatalogId: null,
            activityCode: activity.code,
            activityType: activity.type,
            frequency: { value: 2, unit: "weeks" },
            alertLead: { value: 2, unit: "days" },
            factoryFrequencies: [factory.frequency],
            warrantyWarningAcknowledgedAt: at(request.now, -14),
            validFrom: at(request.now, -14),
            validTo: null,
            actorId: demoUserId("owner"),
            reason: "Ajuste por sedimentos detectados durante la inspección",
            version: 3,
          }
        : null;
    const effective = machineOverride ?? accountOverride;
    const source = machineOverride ? "MACHINE" : accountOverride ? "ACCOUNT" : "TEMPLATE";
    return {
      activityCode: activity.code,
      componentCatalogId: null,
      activityName: activity.name,
      activityType: activity.type,
      frequency: effective?.frequency ?? factory.frequency,
      alertLead: effective?.alertLead ?? factory.alertLead,
      source,
      alertSource: source,
      factory,
      differsFromFactory: effective !== null,
      warrantyApplies: true,
      accountOverride,
      machineOverride,
    };
  });
  const own = equipmentAccountCatalog(request)[index % 2]!;
  const activity = own.maintenanceActivity!;
  items.push({
    activityCode: activity.code,
    componentCatalogId: own.id,
    activityName: activity.name,
    activityType: "MAINTENANCE",
    frequency: activity.defaultFrequency,
    alertLead: null,
    source: "TEMPLATE",
    alertSource: null,
    factory: { frequency: activity.defaultFrequency, alertLead: null },
    differsFromFactory: false,
    warrantyApplies: false,
    accountOverride: null,
    machineOverride: null,
  });
  return { machineId: machine.id, items };
}

export function equipmentModelFrequencies(request: DemoRequest, modelId: string): ModelFrequencies {
  const machines = request.machines.filter((machine) => machine.modelId === modelId);
  const items = new Map<string, ModelFrequency>();
  for (const machine of machines)
    for (const item of equipmentFrequencies(request, machine).items) {
      if (item.componentCatalogId !== null) continue;
      const entry: ModelFrequency = items.get(item.activityCode) ?? {
        activityCode: item.activityCode,
        activityName: item.activityName,
        activityType: item.activityType,
        factoryFrequencies: [item.factory.frequency],
        accountOverride: item.accountOverride,
        machines: [],
      };
      entry.machines.push({
        machineId: machine.id,
        machineCode: machine.code,
        frequency: item.frequency,
        alertLead: item.alertLead,
        source: item.source,
        differsFromFactory: item.differsFromFactory,
        machineOverride: item.machineOverride,
      });
      items.set(item.activityCode, entry);
    }
  return {
    modelId,
    machineCount: machines.length,
    items: [...items.values()].sort((a, b) => a.activityCode.localeCompare(b.activityCode)),
  };
}

export function equipmentSchedules(request: DemoRequest, machine: DemoMachine) {
  return equipmentFrequencies(request, machine).items.map((item, index) => {
    const templateActivity: ActivityDefinition = {
      code: item.activityCode,
      name: item.activityName,
      category: item.activityType === "SANITATION" ? "sanitation" : "maintenance",
      triggerType: "time",
      frequencyDays: item.factory.frequency.value,
      triggerDescription: "",
      responsibleRole: "TC",
      checklist: [
        {
          code: "VERIFICAR",
          label: "Realizar la actividad y verificar el funcionamiento",
          required: true,
        },
      ],
      fields: [],
      evidenceRules: { required: true, minimumFiles: 1 },
      escalationRules: { afterHours: 24, notifyRole: "OW" },
      criticality: "medium",
    };
    const componentActivity = equipmentAccountCatalog(request).find(
      (entry) => entry.id === item.componentCatalogId,
    )?.maintenanceActivity;
    return {
      id: demoIds.schedule(indexOf(machine) * 10 + index),
      machine_id: machine.id,
      template_id: equipmentMachine(request, machine).template_id,
      activity_code: item.activityCode,
      component_catalog_id: item.componentCatalogId,
      definition: {
        ...(componentActivity
          ? { ...componentActivity, componentCatalogId: item.componentCatalogId }
          : templateActivity),
        schedule: {
          frequency: item.frequency,
          source: item.source,
          factory: item.factory.frequency,
          alertLead: item.alertLead,
          alertSource: item.alertSource,
          anchor: at(request.now, -20),
          timezone: "America/Mexico_City",
        },
      },
      due_at: at(request.now, [-3, 1, 7, 18][index]!),
      status: index === 0 ? "completed" : "pending",
      created_at: at(request.now, -20),
      generation_key: `demo-${machine.id}-${item.activityCode}`,
    };
  });
}

/** Like TransfersStore.detail: only the source account can list these transfers. */
export function equipmentTransfers(request: DemoRequest) {
  if (empty(request)) return [];
  const destination = DEMO_ACCOUNTS[request.account.key === "polar" ? "bajio" : "polar"];
  return request.account.machines.slice(0, 2).map((machine, index) => ({
    id: demoIds.transfer(accountIndex(request) * 10 + index),
    account_id: request.account.id,
    machine_id: machine.id,
    to_account_id: destination.id,
    to_branch_id: destination.branches[index]!.id,
    folio: `TRF-${request.account.key === "polar" ? "PN" : "BJ"}-${String(index + 1).padStart(4, "0")}`,
    status: index === 0 ? "pending" : "approved",
    machine_version: 3,
    row_version: index + 1,
    created_at: at(request.now, index === 0 ? -2 : -9),
    executed_at: null,
    data: {
      machineId: machine.id,
      toAccountId: destination.id,
      toBranchId: destination.branches[index]!.id,
      reason:
        index === 0
          ? "Reubicación propuesta por ajuste de capacidad"
          : "Transferencia aprobada para ampliar el servicio",
      authorizationFileIds: [],
      commercialDataTransfer: { sales: false, customers: false, recharges: false, orders: false },
      confirmation: true,
    },
  }));
}
