// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoApiResponse, DemoRequest, equipmentWorkspace } from "../../server/demo/api";
import { defaultDemoState, type DemoState } from "../../server/demo/state";
import { DEMO_ACCOUNTS } from "../../server/demo/fixtures";
import { ROLE_PERMISSIONS } from "../../server/demo/personas";
import { MachineDetailScreen } from "./detail-screen";
import { MachineAdministration } from "./machine-administration";
import { machineDetailFixture } from "../../server/demo/machine-detail";
import { createEquipmentClient } from "../equipment/configuration-client";
import { machineAccessSchema, machinePermissions, recordDate } from "./detail-model";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const id = DEMO_ACCOUNTS.polar.machines[0]!.id;
const now = Date.parse("2026-11-23T18:00:00Z");
function mockApi(state = defaultDemoState()) {
  const calls: { path: string; version: string | null; method: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const address = new URL(url, "http://local");
      let path =
        address.pathname === "/api/audit"
          ? `audit-events?${address.searchParams}`
          : address.searchParams.get("path")!;
      const data = init?.body instanceof FormData ? init.body : null;
      if (data) path = String(data.get("path"));
      calls.push({
        path,
        version: data?.get("version") as string | null,
        method: data ? String(data.get("method")) : "GET",
      });
      return demoApiResponse(
        path,
        data
          ? {
              method: String(data.get("method")),
              body: String(data.get("body")),
              headers: {
                "if-match": String(data.get("version") ?? ""),
                "idempotency-key": String(data.get("key")),
              },
            }
          : {},
        state,
        now,
      );
    }),
  );
  return calls;
}
function open(state: DemoState, role: keyof typeof ROLE_PERMISSIONS) {
  const calls = mockApi(state);
  render(
    <main id="main-content" data-page-ready="false">
      <MachineDetailScreen
        id={id}
        contextId="demo"
        csrfToken="demo"
        permissions={ROLE_PERMISSIONS[role]}
      />
    </main>,
  );
  return calls;
}
describe("UXD-04 single machine detail", () => {
  it("renders condition values/dates and reuses components, frequencies and history", async () => {
    const calls = open(defaultDemoState(), "OW");
    await screen.findByRole("heading", { name: DEMO_ACCOUNTS.polar.machines[0]!.name, level: 1 });
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Condición técnica:")).toBeTruthy();
    expect(screen.queryByText("Sin datos")).toBeNull();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Resumen",
      "Componentes",
      "Frecuencias y alertas",
      "Calendario",
      "Historial",
    ]);
    await userEvent.click(screen.getByRole("tab", { name: "Componentes" }));
    await screen.findByRole("table", { name: "Componentes de la máquina" });
    expect(screen.getByText("Crear componente propio", { selector: "summary" })).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: "Frecuencias y alertas" }));
    await screen.findByRole("table", { name: "Frecuencias de la máquina" });
    await userEvent.click(screen.getByRole("tab", { name: "Historial" }));
    await userEvent.click(await screen.findByRole("button", { name: "Auditoría" }));
    await screen.findByRole("table", { name: "Registros de la máquina" });
    expect(calls.some((call) => call.path.startsWith("audit-events?machineId=" + id))).toBe(true);
    expect(screen.queryByText(/Cambio de correo/)).toBeNull();
  });
  it.each([
    ["technician", "TC"],
    ["readonly", "AU"],
    ["admin", "OP"],
  ] as const)("hides unauthorized actions for %s", async (persona, role) => {
    open({ ...defaultDemoState(), persona }, role);
    await screen.findByRole("heading", { level: 1, name: DEMO_ACCOUNTS.polar.machines[0]!.name });
    expect(screen.queryByRole("button", { name: /^Editar/ })).toBeNull();
    expect(Boolean(screen.queryByRole("link", { name: "Reportar una falla" }))).toBe(role !== "AU");
    await userEvent.click(screen.getByRole("tab", { name: "Componentes" }));
    await screen.findByRole("table", { name: "Componentes de la máquina" });
    expect(
      Boolean(screen.queryByText("Agregar componente del catálogo", { selector: "summary" })),
    ).toBe(role === "OP");
    expect(screen.queryByText("Crear componente propio", { selector: "summary" })).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: "Historial" }));
    expect(Boolean(screen.queryByRole("button", { name: "Auditoría" }))).toBe(role === "AU");
  });
  it("keeps MFA requirements and submits inline metadata with row_version", async () => {
    const state = defaultDemoState();
    const calls = mockApi(state);
    const request = new DemoRequest(state, now);
    const machine = machineDetailFixture(request, id)!;
    render(
      <MachineAdministration
        machine={machine}
        branches={[]}
        transfers={[]}
        canManage
        disabled={false}
        hasMfa={false}
        client={createEquipmentClient("demo", "demo")}
        refresh={async () => undefined}
      />,
    );
    for (const name of ["sucursal", "retiro definitivo", "transferencia a otra cuenta"])
      expect(screen.getByRole("button", { name: `Editar ${name}` }).hasAttribute("disabled")).toBe(
        true,
      );
    await userEvent.click(screen.getByRole("button", { name: "Editar nombre y marca" }));
    const form = screen.getByRole("form", { name: "Editar nombre y marca" });
    expect((within(form).getByLabelText("Nombre") as HTMLInputElement).value).toBe(
      machine.data.internalName,
    );
    await userEvent.clear(within(form).getByLabelText("Nombre"));
    await userEvent.type(within(form).getByLabelText("Nombre"), "Equipo actualizado");
    await userEvent.click(within(form).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.path === `machines/${id}` && call.version === "3" && call.method === "PATCH",
        ),
      ).toBe(true),
    );
  });
  it.each(["estado operativo", "sucursal", "retiro definitivo", "transferencia a otra cuenta"])(
    "preserves version and confirmation when editing %s",
    async (name) => {
      const machine = machineDetailFixture(new DemoRequest(defaultDemoState(), now), id)!;
      const send = vi.fn().mockResolvedValue({});
      render(
        <MachineAdministration
          machine={machine}
          branches={[{ id: machine.branch_id, status: "active", data: { name: "Centro" } }]}
          transfers={[]}
          canManage
          disabled={false}
          hasMfa
          client={{ get: vi.fn(), send }}
          refresh={async () => undefined}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: `Editar ${name}` }));
      const form = screen.getByRole("form", { name: `Editar ${name}` });
      if (name === "transferencia a otra cuenta") {
        await userEvent.type(
          within(form).getByLabelText("Cuenta destino"),
          "a0000000-0000-4000-8000-000000000002",
        );
        await userEvent.type(
          within(form).getByLabelText("Sucursal destino"),
          "b0000000-0000-4000-8000-000000000002",
        );
      }
      await userEvent.clear(within(form).getByLabelText("Motivo del cambio"));
      await userEvent.type(
        within(form).getByLabelText("Motivo del cambio"),
        "Cambio autorizado por la cuenta",
      );
      await userEvent.click(within(form).getByRole("checkbox"));
      await userEvent.click(within(form).getByRole("button", { name: "Guardar" }));
      if (["retiro definitivo", "transferencia a otra cuenta"].includes(name)) {
        expect(send).not.toHaveBeenCalled();
        const dialog = screen.getByRole("alertdialog");
        await userEvent.click(within(dialog).getByRole("checkbox"));
        await userEvent.click(
          within(dialog).getByRole("button", {
            name: name === "retiro definitivo" ? "Retirar máquina" : "Solicitar transferencia",
          }),
        );
      }
      await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
      expect(send.mock.calls[0]![1]).toMatchObject({
        reason: "Cambio autorizado por la cuenta",
        confirmation: true,
      });
      expect(send.mock.calls[0]![2]).toMatchObject({
        method: "POST",
        version: machine.row_version,
      });
    },
  );
  it("keeps component/frequency permissions separate and formats missing dates honestly", () => {
    const request = new DemoRequest(defaultDemoState(), now);
    const machine = machineDetailFixture(request, id)!;
    const access = machineAccessSchema.parse(equipmentWorkspace(request));
    const allowed = machinePermissions(
      machine,
      access,
      ["equipment.machine-components-manage"],
      true,
    );
    expect(allowed.components).toBe("edit");
    expect(allowed.frequencies).toBe("role-read-only");
    expect(recordDate(undefined)).toBe("Sin registro");
  });
});
