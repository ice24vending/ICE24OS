// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountMember, AccountMemberDetail } from "@ice24/contracts";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}));
import { UsersTable } from "./users-table";
import { RoleScopeFields, readRoleScope } from "./role-scope-fields";
import { MemberScreen } from "./member-screen";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const options = {
  branches: [
    { id: "b1", name: "Centro" },
    { id: "b2", name: "Cumbres" },
  ],
  machines: [{ id: "m1", label: "Despachadora Juárez · ICE24-0001 · Centro", branchId: "b1" }],
};
const member = (overrides: Partial<AccountMember> = {}): AccountMember => ({
  id: "u1",
  row_version: 3,
  status: "ACTIVE",
  display_name: "Laura Méndez",
  email: "laura@demo.invalid",
  phone: null,
  job_title: "Directora",
  roles: ["OW"],
  is_primary_owner: false,
  account_wide: true,
  branch_ids: [],
  machine_ids: [],
  denies_equipment_changes: false,
  last_access_at: "2026-11-25T18:00:00Z",
  ...overrides,
});

async function expectNoAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

describe("UsersTable (UXD-09)", () => {
  const rows = [
    member(),
    member({
      id: "u2",
      display_name: "Jorge Salinas",
      roles: ["OP"],
      account_wide: false,
      branch_ids: ["b1", "b2"],
      status: "PENDING",
      last_access_at: null,
    }),
    member({
      id: "u3",
      display_name: "Héctor Luna",
      roles: ["TC"],
      account_wide: false,
      machine_ids: ["m1"],
      status: "SUSPENDED",
    }),
  ];

  it("shows role, scope, state and last access in words, each row opening the person", async () => {
    const { container } = render(<UsersTable rows={rows} options={options} canInvite />);
    const table = screen.getByRole("table", { name: "Usuarios de la cuenta" });
    for (const text of [
      "Dueño",
      "Administrador de sucursal",
      "Técnico",
      "Cuenta completa",
      "Sucursales: Centro, Cumbres",
      "Máquinas: Despachadora Juárez · ICE24-0001 · Centro",
      "Activo",
      "Invitado",
      "Suspendido",
      "Nunca",
    ])
      expect(within(table).getByText(text)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Jorge Salinas" }).getAttribute("href")).toBe(
      "/account/users/u2",
    );
    expect(screen.getByRole("link", { name: "Invitar usuario" }).getAttribute("href")).toBe(
      "/account/users/invite",
    );
    await expectNoAxeViolations(container);
  });

  it("hides «Invitar usuario» from whoever cannot invite", () => {
    render(<UsersTable rows={rows} canInvite={false} />);
    expect(screen.queryByRole("link", { name: "Invitar usuario" })).toBeNull();
  });
});

describe("RoleScopeFields (UXD-09)", () => {
  it("shows the machine list only for the «Máquinas» scope", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <RoleScopeFields options={options} />
      </form>,
    );
    expect(screen.queryByRole("group", { name: "Máquinas" })).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Sucursales" }));
    expect(screen.getByRole("checkbox", { name: "Cumbres" })).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: /Despachadora/ })).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Máquinas" }));
    expect(screen.getByRole("checkbox", { name: /Despachadora/ })).toBeTruthy();
  });

  it("keeps the only active Owner in the role and explains why", () => {
    render(
      <form>
        <RoleScopeFields
          options={options}
          initial={{ role: "OW", scope: "ACCOUNT", branchIds: [], machineIds: [] }}
          ownerOnly
        />
      </form>,
    );
    expect((screen.getByRole("radio", { name: "Técnico" }) as HTMLInputElement).disabled).toBe(
      true,
    );
    expect(
      screen.getAllByText("No disponible: es el único Dueño activo de la cuenta."),
    ).toHaveLength(4);
  });

  it("asks for at least one branch or machine and reads one role", () => {
    const form = new FormData();
    form.set("role", "OP");
    form.set("scope", "BRANCH");
    expect(readRoleScope(form).errors).toEqual({ branchIds: "Elige al menos una sucursal." });
    form.append("branchIds", "b1");
    form.append("branchIds", "b2");
    form.append("machineIds", "m1");
    expect(readRoleScope(form).value).toEqual({
      role: "OP",
      scope: "BRANCH",
      branchIds: ["b1", "b2"],
      machineIds: [],
      denyEquipmentChanges: false,
    });
  });
});

describe("MemberScreen (UXD-09)", () => {
  const detail = (
    overrides: Partial<AccountMemberDetail> = {},
    period = "week",
  ): AccountMemberDetail => ({
    member: member({
      id: "u2",
      display_name: "Jorge Salinas",
      roles: ["OP"],
      account_wide: false,
      branch_ids: ["b1"],
    }),
    lastActiveOwner: false,
    self: false,
    activity: {
      period: period as "week",
      from: "2026-11-20T06:00:00Z",
      timeZone: "America/Mexico_City",
      maintenanceCompleted: period === "month" ? 9 : 2,
      ticketsCreated: 3,
      ticketsAttended: 1,
      ordersAssigned: 4,
      recentWorkOrders: [
        {
          id: "o1",
          folio: "OT-000001",
          machine_code: "ICE24-0001",
          state: "completed",
          at: "2026-11-24T16:00:00Z",
        },
      ],
      recentTickets: [],
    },
    ...overrides,
  });
  function stubApi(value: (period: string) => AccountMemberDetail) {
    const sent: { path: string; method: string; body: unknown; version: string | null }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init: RequestInit = {}) => {
        if (init.method === "POST") {
          const form = init.body as FormData;
          sent.push({
            path: String(form.get("path")),
            method: String(form.get("method")),
            body: JSON.parse(String(form.get("body"))),
            version: form.get("version") as string | null,
          });
          return new Response("{}", { status: 200 });
        }
        const path = new URL(input, "https://x.invalid").searchParams.get("path")!;
        const body =
          path === "equipment-workspace"
            ? { canManage: true, hasMfa: true, accessMode: "ACTIVE", accountWide: true }
            : path === "branches"
              ? [{ id: "b1", status: "active", data: { name: "Centro" } }]
              : path === "machines"
                ? []
                : value(new URLSearchParams(path.split("?")[1]).get("period")!);
        return new Response(JSON.stringify(body), { status: 200 });
      }),
    );
    return sent;
  }

  it("refuses to suspend or end the only active Owner before asking the API", async () => {
    stubApi(() => detail({ member: member(), lastActiveOwner: true }));
    render(<MemberScreen id="u1" contextId="c" csrfToken="t" />);
    expect(await screen.findByText(/es el único Dueño activo de la cuenta/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Suspender" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getByRole("button", { name: "Finalizar asociación" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("reloads the activity for the chosen period", async () => {
    const user = userEvent.setup();
    stubApi((period) => detail({}, period));
    render(<MemberScreen id="u2" contextId="c" csrfToken="t" />);
    const metric = () =>
      screen.getByText("Mantenimientos completados").nextElementSibling?.textContent;
    await screen.findByRole("heading", { name: "Actividad" });
    expect(metric()).toBe("2");
    await user.click(screen.getByRole("radio", { name: "Mes" }));
    await waitFor(() => expect(metric()).toBe("9"));
    expect(screen.getByRole("link", { name: "OT-000001" }).getAttribute("href")).toBe(
      "/maintenance/work-orders/o1",
    );
  });

  it("saves role and scope only after a confirmation with a reason", async () => {
    const user = userEvent.setup();
    const sent = stubApi(() => detail());
    render(<MemberScreen id="u2" contextId="c" csrfToken="t" />);
    await user.click(await screen.findByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("radio", { name: "Técnico" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    const dialog = await screen.findByRole("dialog");
    expect(sent).toEqual([]);
    await user.type(within(dialog).getByLabelText(/Motivo/), "Cambio de responsabilidades");
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      path: "account-users/u2/permissions",
      method: "PATCH",
      version: "3",
      body: {
        roleCodes: ["TC"],
        branchIds: ["b1"],
        machineIds: [],
        reason: "Cambio de responsabilidades",
        overrides: [],
      },
    });
  });
});
