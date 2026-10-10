// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  EffectiveFrequency,
  FrequencyOverride,
  MachineComponents,
  MachineFrequencies,
  ModelFrequencies,
} from "@ice24/contracts";
import { AccountConfiguration } from "./account-configuration";
import { createEquipmentClient } from "./configuration-client";
import {
  accountConfigurationMode,
  formatFrequency,
  machineConfigurationMode,
  needsWarrantyWarning,
  sameFrequency,
} from "./configuration-model";
import { Tabs } from "./configuration-ui";
import { MachineComponentsPanel, MachineFrequenciesPanel } from "./machine-configuration";

const MACHINE = "11111111-1111-4111-8111-111111111111";
const BRANCH = "22222222-2222-4222-8222-222222222222";
const OTHER_BRANCH = "33333333-3333-4333-8333-333333333333";
const COMPONENT = "44444444-4444-4444-8444-444444444444";
const OWN = "55555555-5555-4555-8555-555555555555";
const MODEL = "66666666-6666-4666-8666-666666666666";
const NOW = "2026-10-09T12:00:00.000Z";
const client = createEquipmentClient("context-a", "csrf-test");

const override = (extra: Partial<FrequencyOverride> = {}): FrequencyOverride => ({
  id: "77777777-7777-4777-8777-777777777777",
  scope: "MACHINE",
  machineId: MACHINE,
  componentCatalogId: null,
  activityCode: "CLEAN",
  activityType: "SANITATION",
  frequency: { value: 10, unit: "days" },
  alertLead: null,
  factoryFrequencies: [{ value: 7, unit: "days" }],
  warrantyWarningAcknowledgedAt: NOW,
  validFrom: NOW,
  validTo: null,
  actorId: "88888888-8888-4888-8888-888888888888",
  reason: "Ajuste por calidad del agua",
  version: 3,
  ...extra,
});
const item = (extra: Partial<EffectiveFrequency> = {}): EffectiveFrequency => ({
  activityCode: "CLEAN",
  componentCatalogId: null,
  activityName: "Limpieza sanitaria",
  activityType: "SANITATION",
  frequency: { value: 7, unit: "days" },
  alertLead: null,
  source: "TEMPLATE",
  alertSource: null,
  factory: { frequency: { value: 7, unit: "days" }, alertLead: null },
  differsFromFactory: false,
  warrantyApplies: true,
  accountOverride: null,
  machineOverride: null,
  ...extra,
});
const frequencies = (items: EffectiveFrequency[]): MachineFrequencies => ({
  machineId: MACHINE,
  items,
});
const components: MachineComponents = {
  machineId: MACHINE,
  current: [
    {
      id: "99999999-9999-4999-8999-999999999991",
      machineId: MACHINE,
      componentCatalogId: COMPONENT,
      component: { code: "CMP", name: "Compresor", scope: "OFFICIAL", status: "active" },
      origin: "TEMPLATE_DEFAULT",
      status: "active",
      validFrom: NOW,
      validTo: null,
      actorId: null,
      reason: null,
      version: 1,
    },
    {
      id: "99999999-9999-4999-8999-999999999992",
      machineId: MACHINE,
      componentCatalogId: OWN,
      component: { code: "UV", name: "Filtro UV", scope: "ACCOUNT", status: "active" },
      origin: "ACCOUNT_CUSTOM",
      status: "inactive",
      validFrom: NOW,
      validTo: null,
      actorId: "88888888-8888-4888-8888-888888888888",
      reason: "No aplica en esta sucursal",
      version: 2,
    },
  ],
  history: [],
};
const catalog = [
  { id: COMPONENT, kind: "component", code: "CMP", scope: "OFFICIAL", data: { name: "Compresor" } },
  {
    id: OWN,
    kind: "component",
    code: "UV",
    scope: "ACCOUNT",
    data: {
      name: "Filtro UV",
      maintenanceActivity: {
        code: "UV_CHANGE",
        name: "Cambio de lámpara UV",
        category: "maintenance",
        defaultFrequency: { value: 6, unit: "months" },
        checklist: [{ code: "PASO_1", label: "Apagar", required: true }],
        evidenceRules: { required: true, minimumFiles: 1 },
      },
    },
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    kind: "component",
    code: "PUMP",
    scope: "OFFICIAL",
    data: { name: "Bomba" },
  },
];

interface Call {
  path: string;
  method: string;
  body: Record<string, unknown> | null;
  version: string | null;
  key: string | null;
}
type Answer = { status?: number; body: unknown };
/** BFF double: answers by `path` (and method for writes) and records every call. */
function bff(routes: Record<string, Answer | Answer[] | (() => Answer)>) {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, "http://localhost");
    let path = url.searchParams.get("path") ?? "";
    let method = "GET";
    let body: Record<string, unknown> | null = null;
    let version: string | null = null;
    let key: string | null = null;
    if (init?.body instanceof FormData) {
      path = String(init.body.get("path"));
      method = String(init.body.get("method"));
      body = JSON.parse(String(init.body.get("body"))) as Record<string, unknown>;
      version = init.body.get("version") as string | null;
      key = init.body.get("key") as string | null;
    }
    calls.push({ path, method, body, version, key });
    const route = routes[`${method} ${path}`] ?? routes[path];
    const answer = Array.isArray(route)
      ? (route.shift() ?? { status: 500, body: {} })
      : typeof route === "function"
        ? route()
        : (route ?? { status: 404, body: { message: "Recurso no disponible en este contexto." } });
    return Response.json(answer.body, { status: answer.status ?? 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

/** axe-core on the rendered tree; color contrast needs a layout engine (checked in the browser). */
async function expectNoAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

async function fillReason(scope: HTMLElement) {
  const user = userEvent.setup();
  await user.type(
    within(scope).getByLabelText("Motivo del cambio (al menos 10 caracteres)"),
    "Ajuste por calidad del agua",
  );
  await user.click(
    within(scope).getByLabelText("Confirmo que revisé los datos y deseo aplicar este cambio"),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RA-01 configuration rules shown in the UI", () => {
  it("formats frequencies and applies the F4-20 equivalences", () => {
    expect(formatFrequency({ value: 1, unit: "weeks" })).toBe("1 semana");
    expect(formatFrequency({ value: 6, unit: "months" })).toBe("6 meses");
    expect(formatFrequency(null, "Sin aviso")).toBe("Sin aviso");
    expect(sameFrequency({ value: 1, unit: "weeks" }, { value: 7, unit: "days" })).toBe(true);
    expect(sameFrequency({ value: 1, unit: "months" }, { value: 30, unit: "days" })).toBe(false);
  });
  it("warns only when an ICE24 factory value changes (RA-01-D1)", () => {
    const factory = [{ value: 7, unit: "days" as const }];
    expect(needsWarrantyWarning(true, factory, { value: 1, unit: "weeks" })).toBe(false);
    expect(needsWarrantyWarning(true, factory, { value: 10, unit: "days" })).toBe(true);
    expect(needsWarrantyWarning(false, factory, { value: 10, unit: "days" })).toBe(false);
  });
  it("derives the controls from RA-01-D2 and the account access mode", () => {
    const owner = {
      accountCatalog: true,
      accountFrequencies: "edit" as const,
      machineBranches: "ALL" as const,
    };
    const operator = {
      accountCatalog: false,
      accountFrequencies: "hidden" as const,
      machineBranches: [BRANCH],
    };
    const technician = {
      accountCatalog: false,
      accountFrequencies: "read" as const,
      machineBranches: [],
    };
    expect(machineConfigurationMode(owner, "ACTIVE", OTHER_BRANCH)).toBe("edit");
    expect(machineConfigurationMode(operator, "ACTIVE", BRANCH)).toBe("edit");
    expect(machineConfigurationMode(operator, "ACTIVE", OTHER_BRANCH)).toBe("role-read-only");
    expect(machineConfigurationMode(technician, "ACTIVE", BRANCH)).toBe("role-read-only");
    expect(machineConfigurationMode(owner, "READ_ONLY", BRANCH)).toBe("account-read-only");
    expect(accountConfigurationMode(owner, "ACTIVE")).toBe("edit");
    expect(accountConfigurationMode(owner, "READ_ONLY")).toBe("account-read-only");
    expect(accountConfigurationMode(operator, "ACTIVE")).toBe("hidden");
    expect(accountConfigurationMode(technician, "ACTIVE")).toBe("role-read-only");
    expect(accountConfigurationMode(undefined, "ACTIVE")).toBe("hidden");
  });
});

describe("Frecuencias y alertas", () => {
  it("shows loading, then factory value, client value and source, accessible", async () => {
    bff({
      [`machines/${MACHINE}/frequencies`]: {
        body: frequencies([
          item(),
          item({
            activityCode: "FILTER",
            activityName: "Cambio de filtro",
            activityType: "MAINTENANCE",
            frequency: { value: 2, unit: "weeks" },
            source: "ACCOUNT",
            factory: { frequency: { value: 30, unit: "days" }, alertLead: null },
            differsFromFactory: true,
            accountOverride: override({ scope: "ACCOUNT", machineId: null }),
          }),
        ]),
      },
      [`machines/${MACHINE}/components`]: { body: components },
    });
    const { container } = render(
      <MachineFrequenciesPanel machineId={MACHINE} client={client} mode="edit" />,
    );
    expect(screen.getByRole("status")).toHaveProperty(
      "textContent",
      expect.stringContaining("Cargando"),
    );
    const card = (await screen.findByRole("heading", { name: /Cambio de filtro/ })).closest("li")!;
    expect(within(card).getByText("30 días")).toBeTruthy();
    expect(within(card).getByText("2 semanas")).toBeTruthy();
    expect(within(card).getByText("Configuración de la cuenta")).toBeTruthy();
    expect(within(card).getByText(/puede afectar la garantía/)).toBeTruthy();
    expect(screen.getByText("Fábrica ICE24")).toBeTruthy();
    await expectNoAxeViolations(container);
  });

  it("asks for the warranty warning before saving a non-factory value and records the consent", async () => {
    const calls = bff({
      [`machines/${MACHINE}/frequencies`]: { body: frequencies([item()]) },
      [`machines/${MACHINE}/components`]: { body: components },
      [`POST machines/${MACHINE}/frequency-overrides`]: { status: 201, body: override() },
    });
    const user = userEvent.setup();
    const { container } = render(
      <MachineFrequenciesPanel machineId={MACHINE} client={client} mode="edit" />,
    );
    await user.click(
      await screen.findByText("Cambiar frecuencia de Limpieza sanitaria", { selector: "summary" }),
    );
    const form = screen.getByRole("group", { name: "Cambiar frecuencia de Limpieza sanitaria" });
    const value = within(form).getAllByLabelText("Cada")[0]!;
    await user.clear(value);
    await user.type(value, "10");
    await fillReason(form);
    await user.click(within(form).getByRole("button", { name: "Guardar frecuencia" }));

    const dialog = await screen.findByRole("alertdialog", {
      name: "Advertencia: posible pérdida de garantía",
    });
    expect(within(dialog).getByText(/7 días/)).toBeTruthy();
    expect(within(dialog).getByText(/10 días/)).toBeTruthy();
    const accept = within(dialog).getByRole("button", { name: "Aceptar y guardar" });
    expect(accept).toHaveProperty("disabled", true);
    expect(dialog.contains(document.activeElement)).toBe(true);
    await expectNoAxeViolations(container);
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    await user.click(within(dialog).getByLabelText(/Entiendo que este cambio puede afectar/));
    await user.click(accept);
    await screen.findByText(/Frecuencia guardada/);
    const write = calls.find((c) => c.method === "POST")!;
    expect(write.path).toBe(`machines/${MACHINE}/frequency-overrides`);
    expect(write.body).toMatchObject({
      activityCode: "CLEAN",
      componentCatalogId: null,
      frequency: { value: 10, unit: "days" },
      warrantyWarningAcknowledged: true,
      confirmation: true,
    });
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("cancelling the warning with Escape saves nothing", async () => {
    const calls = bff({
      [`machines/${MACHINE}/frequencies`]: { body: frequencies([item()]) },
      [`machines/${MACHINE}/components`]: { body: components },
    });
    const user = userEvent.setup();
    render(<MachineFrequenciesPanel machineId={MACHINE} client={client} mode="edit" />);
    await user.click(
      await screen.findByText("Cambiar frecuencia de Limpieza sanitaria", { selector: "summary" }),
    );
    const form = screen.getByRole("group", { name: "Cambiar frecuencia de Limpieza sanitaria" });
    const value = within(form).getAllByLabelText("Cada")[0]!;
    await user.clear(value);
    await user.type(value, "3");
    await fillReason(form);
    await user.click(within(form).getByRole("button", { name: "Guardar frecuencia" }));
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    await screen.findByText(/rechazaste la advertencia de garantía/);
    expect(calls.filter((c) => c.method !== "GET")).toEqual([]);
  });

  it("opens the warning when the API requires it (422) and retries with the consent", async () => {
    const calls = bff({
      [`machines/${MACHINE}/frequencies`]: {
        body: frequencies([
          item({ machineOverride: override({ frequency: { value: 7, unit: "days" } }) }),
        ]),
      },
      [`machines/${MACHINE}/components`]: { body: components },
      [`PUT machines/${MACHINE}/frequency-overrides`]: [
        {
          status: 422,
          body: {
            message: "Confirma la advertencia",
            code: "WARRANTY_WARNING_CONFIRMATION_REQUIRED",
          },
        },
        { body: override() },
      ],
    });
    const user = userEvent.setup();
    render(<MachineFrequenciesPanel machineId={MACHINE} client={client} mode="edit" />);
    await user.click(
      await screen.findByText("Cambiar frecuencia de Limpieza sanitaria", { selector: "summary" }),
    );
    const form = screen.getByRole("group", { name: "Cambiar frecuencia de Limpieza sanitaria" });
    // 1 week equals the factory 7 days: no warning from the UI, the API decides.
    const unit = within(form).getAllByLabelText("Unidad")[0]!;
    const value = within(form).getAllByLabelText("Cada")[0]!;
    await user.clear(value);
    await user.type(value, "1");
    await user.selectOptions(unit, "weeks");
    await fillReason(form);
    await user.click(within(form).getByRole("button", { name: "Guardar frecuencia" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "Aceptar y guardar" }));
    await screen.findByText(/Frecuencia guardada/);
    const writes = calls.filter((c) => c.method === "PUT");
    expect(writes).toHaveLength(2);
    expect(writes[0]!.version).toBe("3");
    expect(writes[0]!.body).not.toHaveProperty("warrantyWarningAcknowledged");
    expect(writes[1]!.body).toMatchObject({ warrantyWarningAcknowledged: true });
    expect(writes[1]!.key).not.toBe(writes[0]!.key);
  });

  it("shows the version conflict state (412) without overwriting and reloads on demand", async () => {
    const calls = bff({
      [`machines/${MACHINE}/frequencies`]: {
        body: frequencies([
          item({
            source: "MACHINE",
            machineOverride: override(),
            differsFromFactory: true,
            frequency: { value: 10, unit: "days" },
          }),
        ]),
      },
      [`machines/${MACHINE}/components`]: { body: components },
      [`POST machines/${MACHINE}/frequency-overrides/reset`]: {
        status: 412,
        body: { message: "Otra persona cambió este registro.", code: "PRECONDITION_FAILED" },
      },
    });
    const user = userEvent.setup();
    render(<MachineFrequenciesPanel machineId={MACHINE} client={client} mode="edit" />);
    await user.click(
      await screen.findByText("Restablecer valor de fábrica de Limpieza sanitaria", {
        selector: "summary",
      }),
    );
    const form = screen.getByRole("group", {
      name: "Restablecer valor de fábrica de Limpieza sanitaria",
    });
    await fillReason(form);
    await user.click(within(form).getByRole("button", { name: "Restablecer valor de fábrica" }));
    expect(await screen.findByRole("heading", { name: "La información cambió" })).toBeTruthy();
    const reads = calls.filter((c) => c.path.endsWith("/frequencies")).length;
    await user.click(screen.getByRole("button", { name: "Actualizar datos" }));
    await waitFor(() =>
      expect(calls.filter((c) => c.path.endsWith("/frequencies")).length).toBe(reads + 1),
    );
  });

  it("resets per component and for the whole machine", async () => {
    const calls = bff({
      [`machines/${MACHINE}/frequencies`]: {
        body: frequencies([
          item({
            activityCode: "UV_CHANGE",
            componentCatalogId: OWN,
            activityName: "Cambio de lámpara UV",
            activityType: "MAINTENANCE",
            warrantyApplies: false,
            source: "MACHINE",
            machineOverride: override({ componentCatalogId: OWN, activityCode: "UV_CHANGE" }),
          }),
        ]),
      },
      [`machines/${MACHINE}/components`]: { body: components },
      [`POST machines/${MACHINE}/frequency-overrides/reset`]: { body: { closed: [] } },
    });
    const user = userEvent.setup();
    render(<MachineFrequenciesPanel machineId={MACHINE} client={client} mode="edit" />);
    expect(
      await screen.findByRole("heading", { name: "Componente propio: Filtro UV" }),
    ).toBeTruthy();
    expect(screen.getByText("Valor por defecto (propio)")).toBeTruthy();
    await user.click(
      screen.getByText("Restablecer valores de fábrica del componente Filtro UV", {
        selector: "summary",
      }),
    );
    const form = screen.getByRole("group", {
      name: "Restablecer valores de fábrica del componente Filtro UV",
    });
    await fillReason(form);
    await user.click(within(form).getByRole("button", { name: "Restablecer componente" }));
    await screen.findByText(/Valores del componente restablecidos/);
    expect(calls.find((c) => c.method === "POST")!.body).toMatchObject({ componentCatalogId: OWN });
    expect(
      screen.getByText("Restablecer valores de fábrica de toda la máquina", {
        selector: "summary",
      }),
    ).toBeTruthy();
  });

  it("read-only roles see values but no controls", async () => {
    bff({
      [`machines/${MACHINE}/frequencies`]: {
        body: frequencies([item({ machineOverride: override() })]),
      },
      [`machines/${MACHINE}/components`]: { body: components },
    });
    const { container } = render(
      <MachineFrequenciesPanel machineId={MACHINE} client={client} mode="role-read-only" />,
    );
    expect(await screen.findByText(/Modo consulta: tu rol puede ver/)).toBeTruthy();
    expect(screen.queryByText(/Cambiar frecuencia/)).toBeNull();
    expect(screen.queryByText(/Restablecer/)).toBeNull();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    await expectNoAxeViolations(container);
  });

  it("explains a read-only account instead of offering changes", async () => {
    bff({
      [`machines/${MACHINE}/frequencies`]: { body: frequencies([item()]) },
      [`machines/${MACHINE}/components`]: { body: components },
    });
    render(
      <MachineFrequenciesPanel machineId={MACHINE} client={client} mode="account-read-only" />,
    );
    expect(await screen.findByText(/La cuenta está en modo lectura/)).toBeTruthy();
    expect(screen.queryByText(/Cambiar frecuencia/)).toBeNull();
  });

  it("renders empty, error with retry and permission denied states", async () => {
    bff({
      [`machines/${MACHINE}/frequencies`]: { body: frequencies([]) },
      [`machines/${MACHINE}/components`]: { body: components },
    });
    render(<MachineFrequenciesPanel machineId={MACHINE} client={client} mode="edit" />);
    expect(
      await screen.findByRole("heading", { name: "Sin frecuencias configurables" }),
    ).toBeTruthy();
    cleanup();

    const calls = bff({
      [`machines/${MACHINE}/frequencies`]: [
        { status: 503, body: { message: "El servicio no está disponible. Intenta nuevamente." } },
        { body: frequencies([item()]) },
      ],
      [`machines/${MACHINE}/components`]: { body: components },
    });
    const user = userEvent.setup();
    render(<MachineFrequenciesPanel machineId={MACHINE} client={client} mode="edit" />);
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("No fue posible completar la consulta"),
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: /Limpieza sanitaria/ })).toBeTruthy();
    expect(calls.filter((c) => c.path.endsWith("/frequencies"))).toHaveLength(2);
    cleanup();

    bff({
      [`machines/${MACHINE}/frequencies`]: {
        status: 403,
        body: { message: "No tienes permiso.", code: "FORBIDDEN" },
      },
      [`machines/${MACHINE}/components`]: { body: components },
    });
    render(<MachineFrequenciesPanel machineId={MACHINE} client={client} mode="edit" />);
    expect(await screen.findByRole("heading", { name: "Sin permiso" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });
});

describe("Componentes", () => {
  it("lists components with origin and state, history and the owner's actions", async () => {
    bff({
      [`machines/${MACHINE}/components`]: {
        body: { ...components, history: components.current },
      },
      catalogs: { body: catalog },
    });
    const { container } = render(
      <MachineComponentsPanel machineId={MACHINE} client={client} mode="edit" canCreateOwn />,
    );
    const uv = (await screen.findByRole("heading", { name: "Filtro UV" })).closest("li")!;
    expect(within(uv).getByText("Propio de la cuenta")).toBeTruthy();
    expect(within(uv).getByText("Inactivo")).toBeTruthy();
    expect(within(uv).getByText(/Cambio de lámpara UV · cada 6 meses · 1 pasos/)).toBeTruthy();
    expect(within(uv).getByText("Activar Filtro UV", { selector: "summary" })).toBeTruthy();
    const compressor = screen.getByRole("heading", { name: "Compresor" }).closest("li")!;
    expect(within(compressor).getByText("Fábrica (plantilla del modelo)")).toBeTruthy();
    expect(screen.getByText("Historial de cambios (2)")).toBeTruthy();
    expect(
      screen.getByText("Agregar componente del catálogo", { selector: "summary" }),
    ).toBeTruthy();
    expect(screen.getByText("Crear componente propio", { selector: "summary" })).toBeTruthy();
    // Already configured components are not offered again.
    const select = screen.getByRole("combobox", { name: "Componente" });
    expect(within(select).queryByText(/Compresor/)).toBeNull();
    expect(within(select).getByText(/Bomba/)).toBeTruthy();
    await expectNoAxeViolations(container);
  });

  it("creates an own component with its activity and adds it to the machine", async () => {
    const calls = bff({
      [`machines/${MACHINE}/components`]: { body: components },
      catalogs: { body: catalog },
      "POST account-catalog-entries": {
        status: 201,
        body: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
      },
      [`POST machines/${MACHINE}/components`]: { status: 201, body: {} },
    });
    const user = userEvent.setup();
    render(<MachineComponentsPanel machineId={MACHINE} client={client} mode="edit" canCreateOwn />);
    await user.click(await screen.findByText("Crear componente propio", { selector: "summary" }));
    const form = screen.getByRole("group", { name: "Crear componente propio" });
    await user.type(within(form).getByLabelText("Código del componente"), "osmosis");
    await user.type(within(form).getByLabelText("Nombre"), "Ósmosis inversa");
    await user.type(within(form).getByLabelText("Código de la actividad"), "ro_flush");
    await user.type(within(form).getByLabelText("Nombre de la actividad"), "Retrolavado");
    await user.type(within(form).getByLabelText("Cada"), "2");
    await user.selectOptions(within(form).getByLabelText("Unidad"), "weeks");
    await user.type(
      within(form).getByLabelText("Pasos del checklist (uno por línea)"),
      "Cerrar válvula{enter}Retrolavar 10 min",
    );
    await fillReason(form);
    await user.click(within(form).getByRole("button", { name: "Crear y agregar a la máquina" }));
    await screen.findByText(/Componente propio creado y agregado/);
    const [created, added] = calls.filter((c) => c.method === "POST");
    expect(created!.body).toMatchObject({
      code: "OSMOSIS",
      kind: "component",
      maintenanceActivity: {
        code: "RO_FLUSH",
        defaultFrequency: { value: 2, unit: "weeks" },
        checklist: [
          { code: "PASO_1", label: "Cerrar válvula", required: true },
          { code: "PASO_2", label: "Retrolavar 10 min", required: true },
        ],
        evidenceRules: { required: true, minimumFiles: 1 },
      },
    });
    expect(added!.body).toMatchObject({
      componentCatalogId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      confirmation: true,
    });
  });

  it("an Operator adds from the catalog but cannot create account components", async () => {
    const calls = bff({
      [`machines/${MACHINE}/components`]: { body: components },
      catalogs: { body: catalog },
      [`POST machines/${MACHINE}/components/99999999-9999-4999-8999-999999999991/deactivate`]: {
        body: {},
      },
    });
    const user = userEvent.setup();
    render(
      <MachineComponentsPanel
        machineId={MACHINE}
        client={client}
        mode="edit"
        canCreateOwn={false}
      />,
    );
    expect(
      await screen.findByText("Agregar componente del catálogo", { selector: "summary" }),
    ).toBeTruthy();
    expect(screen.queryByText("Crear componente propio", { selector: "summary" })).toBeNull();
    await user.click(screen.getByText("Desactivar Compresor", { selector: "summary" }));
    const form = screen.getByRole("group", { name: "Desactivar Compresor" });
    await fillReason(form);
    await user.click(within(form).getByRole("button", { name: "Desactivar" }));
    await screen.findByText(/Componente desactivado/);
    expect(calls.find((c) => c.method === "POST")!.version).toBe("1");
  });

  it("read-only roles and the empty machine", async () => {
    bff({
      [`machines/${MACHINE}/components`]: { body: { ...components, current: [] } },
      catalogs: { body: catalog },
    });
    const { container } = render(
      <MachineComponentsPanel
        machineId={MACHINE}
        client={client}
        mode="role-read-only"
        canCreateOwn={false}
      />,
    );
    expect(await screen.findByRole("heading", { name: "Sin componentes" })).toBeTruthy();
    expect(
      screen.queryByText("Agregar componente del catálogo", { selector: "summary" }),
    ).toBeNull();
    await expectNoAxeViolations(container);
  });
});

describe("Configuración de cuenta", () => {
  const model: ModelFrequencies = {
    modelId: MODEL,
    machineCount: 2,
    items: [
      {
        activityCode: "CLEAN",
        activityName: "Limpieza sanitaria",
        activityType: "SANITATION",
        factoryFrequencies: [{ value: 7, unit: "days" }],
        accountOverride: null,
        machines: [
          {
            machineId: MACHINE,
            machineCode: "ICE24-0001",
            frequency: { value: 7, unit: "days" },
            alertLead: null,
            source: "TEMPLATE",
            differsFromFactory: false,
            machineOverride: null,
          },
          {
            machineId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            machineCode: "ICE24-0002",
            frequency: { value: 10, unit: "days" },
            alertLead: null,
            source: "MACHINE",
            differsFromFactory: true,
            machineOverride: override(),
          },
        ],
      },
    ],
  };
  const routes = () => ({
    "account-frequency-overrides": {
      body: { current: [override({ scope: "ACCOUNT", machineId: null, activityCode: "FILTER" })] },
    },
    "account-catalog-entries": { body: { items: [], nextCursor: null } },
    machines: { body: [{ id: MACHINE, model_id: MODEL, operational_status: "off" }] },
    [`technical-models/${MODEL}/frequencies`]: { body: model },
  });

  it("applies a frequency to every machine of a model after the warranty warning", async () => {
    const calls = bff({
      ...routes(),
      [`POST technical-models/${MODEL}/frequency-overrides`]: {
        body: { applied: [override(), override()], skippedMachineIds: [] },
      },
    });
    const user = userEvent.setup();
    const { container } = render(
      <AccountConfiguration
        client={client}
        mode="edit"
        models={[{ id: MODEL, code: "M450", data: { name: "ICE24 450" } }]}
      />,
    );
    await user.selectOptions(await screen.findByLabelText("Modelo"), MODEL);
    expect(await screen.findByText("1 de 2")).toBeTruthy();
    expect(
      screen.getByText("Restablecer valores de fábrica de la cuenta", { selector: "summary" }),
    ).toBeTruthy();
    await expectNoAxeViolations(container);
    await user.click(
      screen.getByText(/Aplicar a todas mis máquinas del modelo/, { selector: "summary" }),
    );
    const form = screen.getByRole("group", {
      name: "Aplicar a todas mis máquinas del modelo: Limpieza sanitaria",
    });
    await user.type(within(form).getAllByLabelText("Cada")[0]!, "14");
    await fillReason(form);
    await user.click(
      within(form).getByRole("button", { name: "Aplicar a todas las máquinas del modelo" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/2 máquina\(s\) del modelo/)).toBeTruthy();
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "Aceptar y guardar" }));
    await screen.findByText(/Frecuencia aplicada a 2 máquina\(s\)/);
    expect(calls.find((c) => c.method === "POST")!.body).toMatchObject({
      activityCode: "CLEAN",
      frequency: { value: 14, unit: "days" },
      warrantyWarningAcknowledged: true,
    });
  });

  it("other account-wide roles consult without controls", async () => {
    bff(routes());
    const user = userEvent.setup();
    const { container } = render(
      <AccountConfiguration
        client={client}
        mode="role-read-only"
        models={[{ id: MODEL, code: "M450", data: { name: "ICE24 450" } }]}
      />,
    );
    await user.selectOptions(await screen.findByLabelText("Modelo"), MODEL);
    expect(await screen.findByText("1 de 2")).toBeTruthy();
    expect(screen.getByText(/Modo consulta/)).toBeTruthy();
    expect(screen.queryByText(/Aplicar a todas/)).toBeNull();
    expect(screen.queryByText(/Restablecer/)).toBeNull();
    await expectNoAxeViolations(container);
  });
});

describe("Expediente: pestañas", () => {
  function Harness() {
    const [active, setActive] = useState("summary");
    return (
      <Tabs
        label="Secciones del expediente"
        idPrefix="m"
        active={active}
        onChange={setActive}
        tabs={[
          { id: "summary", title: "Resumen y acciones" },
          { id: "components", title: "Componentes" },
          { id: "frequencies", title: "Frecuencias y alertas" },
        ]}
      />
    );
  }
  it("moves between tabs with the arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const first = screen.getByRole("tab", { name: "Resumen y acciones" });
    await user.tab();
    expect(document.activeElement).toBe(first);
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Componentes" })).toHaveProperty("ariaSelected", "true");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Componentes" }));
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Frecuencias y alertas" }));
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(first);
    expect(screen.getAllByRole("tab").filter((tab) => tab.tabIndex === 0)).toHaveLength(1);
  });
});
