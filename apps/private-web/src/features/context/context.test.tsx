// @vitest-environment jsdom
import { cleanup, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContextSelector, FocusLostBanner } from "./context-selector";
import {
  locationAfterSwitch,
  resolveFocus,
  roleLabel,
  safePath,
  type ContextSelectorData,
} from "./model";
import { hasUnsavedChanges, useUnsavedChanges } from "./unsaved-changes";

const id = (prefix: string, n: number) => `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const BRANCH_A = { id: id("b0000000", 1), name: "Centro" };
const BRANCH_B = { id: id("b0000000", 2), name: "Cumbres" };
const MACHINE_A = { id: id("c0000000", 1), name: "Despachadora", code: "M-1", branchId: BRANCH_A.id };
const MACHINE_B = { id: id("c0000000", 2), name: "Fábrica", code: "M-2", branchId: BRANCH_B.id };
const OPTIONS = { branches: [BRANCH_A, BRANCH_B], machines: [MACHINE_A, MACHINE_B] };
const POLAR = {
  accountId: id("a0000000", 1),
  accountName: "Hielo Polar",
  roles: "Propietario de cuenta",
  readOnly: false,
};
const BAJIO = {
  accountId: id("a0000000", 2),
  accountName: "Agua del Bajío",
  roles: "Operador",
  readOnly: true,
};
const data = (overrides: Partial<ContextSelectorData> = {}): ContextSelectorData => ({
  current: POLAR,
  accounts: [POLAR, BAJIO],
  options: OPTIONS,
  branch: null,
  machine: null,
  focusLost: false,
  ...overrides,
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("context model", () => {
  it("names roles as authz.roles does", () => {
    expect(roleLabel(["OW"])).toBe("Propietario de cuenta");
    expect(roleLabel(["OP", "AU"])).toBe("Operador · Consulta/Auditor");
    expect(roleLabel([])).toBe("Sin rol");
  });

  it("keeps a saved focus only while the API still lists it", () => {
    const saved = { branchId: BRANCH_A.id, machineId: MACHINE_A.id };
    expect(resolveFocus(saved, OPTIONS)).toEqual({
      branch: BRANCH_A,
      machine: MACHINE_A,
      focusLost: false,
    });
    expect(resolveFocus(undefined, OPTIONS)).toEqual({ branch: null, machine: null, focusLost: false });
    // Lost access: the branch, the machine, or the pair no longer matches.
    for (const lost of [
      { branchId: id("b0000000", 9), machineId: null },
      { branchId: null, machineId: id("c0000000", 9) },
      { branchId: BRANCH_A.id, machineId: MACHINE_B.id },
    ])
      expect(resolveFocus(lost, OPTIONS)).toEqual({ branch: null, machine: null, focusLost: true });
    expect(resolveFocus(saved, "forbidden").focusLost).toBe(true);
    // A failed load is not a lost access.
    expect(resolveFocus(saved, null).focusLost).toBe(false);
  });

  it("refuses paths outside the private web", () => {
    for (const unsafe of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "/\t/evil.test",
      "/\n/evil.test",
      "/./api/x",
      "/api/x",
      "x",
      5,
    ])
      expect(safePath(unsafe)).toBeNull();
    expect(safePath("/files?x=1")).toBe("/files?x=1");
  });

  it("keeps the page in the same account and the module start in another one", () => {
    const destinations = [{ href: "/machines" }, { href: "/files" }];
    expect(locationAfterSwitch("/files/abc?x=1", destinations, true)).toBe("/files/abc?x=1");
    expect(locationAfterSwitch("/files/abc?x=1", destinations, false)).toBe("/files");
    // Module not authorized in the new context: its first destination.
    expect(locationAfterSwitch("/audit", destinations, false)).toBe("/machines");
    expect(locationAfterSwitch("//evil.test", destinations, false)).toBe("/machines");
    expect(locationAfterSwitch("/audit", [], false)).toBe("/profile");
  });
});

describe("unsaved changes registry", () => {
  it("tracks dirty screens until they are clean or unmounted", () => {
    const { rerender, unmount } = renderHook(({ dirty }) => useUnsavedChanges(dirty), {
      initialProps: { dirty: false },
    });
    expect(hasUnsavedChanges()).toBe(false);
    rerender({ dirty: true });
    expect(hasUnsavedChanges()).toBe(true);
    rerender({ dirty: false });
    expect(hasUnsavedChanges()).toBe(false);
    rerender({ dirty: true });
    unmount();
    expect(hasUnsavedChanges()).toBe(false);
  });
});

describe("ContextSelector", () => {
  const open = async (overrides: Partial<ContextSelectorData> = {}) => {
    const user = userEvent.setup();
    render(<ContextSelector data={data(overrides)} csrfToken="csrf" />);
    await user.click(screen.getByRole("button", { name: /Cambiar contexto/u }));
    return { user, dialog: screen.getByRole("dialog", { name: "Contexto de trabajo" }) };
  };
  const stubFetch = (response: Response | Error) => {
    const fetch = vi.fn(async () => {
      if (response instanceof Error) throw response;
      return response;
    });
    vi.stubGlobal("fetch", fetch);
    return fetch;
  };

  it("always shows account, role, branch and machine in the trigger", () => {
    render(
      <ContextSelector
        data={data({ branch: BRANCH_A, machine: MACHINE_A })}
        csrfToken="csrf"
      />,
    );
    const trigger = screen.getByRole("button", { name: /Cambiar contexto/u });
    for (const text of ["Cuenta", "Hielo Polar", "Rol", "Propietario de cuenta", "Sucursal", "Centro", "Máquina", "Despachadora (M-1)"])
      expect(within(trigger).getByText(text)).toBeTruthy();
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("lists only the server's accounts and branches, marks the current one and passes axe", async () => {
    const { dialog } = await open();
    const accounts = within(dialog).getAllByRole("listitem");
    expect(accounts).toHaveLength(2);
    expect(within(dialog).getByRole("button", { name: /Hielo Polar/u }).getAttribute("aria-current")).toBe("true");
    expect(within(dialog).getByText("Solo lectura")).toBeTruthy();
    const branch = within(dialog).getByLabelText("Sucursal");
    expect([...branch.querySelectorAll("option")].map((o) => o.textContent)).toEqual([
      "Todas las sucursales",
      "Centro",
      "Cumbres",
    ]);
    const results = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  it("filters machines by branch and drops a machine of another branch", async () => {
    const { user, dialog } = await open();
    const machine = within(dialog).getByLabelText("Máquina") as HTMLSelectElement;
    await user.selectOptions(machine, MACHINE_B.id);
    await user.selectOptions(within(dialog).getByLabelText("Sucursal"), BRANCH_A.id);
    expect(machine.value).toBe("");
    expect([...machine.options].map((o) => o.textContent)).toEqual([
      "Todas las máquinas",
      "Despachadora (M-1)",
    ]);
  });

  it("posts the focus with CSRF and the current page, then loads the new location", async () => {
    const fetch = stubFetch(Response.json({ location: "/files" }));
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, pathname: "/files", search: "", assign });
    const { user, dialog } = await open();
    await user.selectOptions(within(dialog).getByLabelText("Sucursal"), BRANCH_B.id);
    await user.click(within(dialog).getByRole("button", { name: "Aplicar sucursal y máquina" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/files"));
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/session-context/focus");
    const body = init.body as FormData;
    expect(Object.fromEntries(body)).toEqual({
      csrfToken: "csrf",
      returnTo: "/files",
      branchId: BRANCH_B.id,
      machineId: "",
    });
  });

  it("shows the BFF message and keeps the dialog open when the switch fails", async () => {
    stubFetch(Response.json({ message: "Esa sucursal o máquina ya no está disponible para ti." }, { status: 404 }));
    const { user, dialog } = await open();
    await user.click(within(dialog).getByRole("button", { name: /Agua del Bajío/u }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain("ya no está disponible");
  });

  it("explains an offline failure without changing the context", async () => {
    stubFetch(new TypeError("Failed to fetch"));
    const { user, dialog } = await open();
    await user.click(within(dialog).getByRole("button", { name: /Agua del Bajío/u }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain("Sin conexión");
  });

  it("asks before discarding unsaved changes", async () => {
    const fetch = stubFetch(Response.json({ location: "/machines" }));
    vi.stubGlobal("location", { ...window.location, assign: vi.fn() });
    const dirty = renderHook(() => useUnsavedChanges(true));
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: /Agua del Bajío/u }));
    const confirm = screen.getByRole("alertdialog", { name: "Tienes cambios sin guardar" });
    await user.click(within(confirm).getByRole("button", { name: "Seguir editando" }));
    expect(fetch).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Agua del Bajío/u }));
    await user.click(screen.getByRole("button", { name: "Descartar y cambiar" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    dirty.unmount();
  });

  it.each<[string, ContextSelectorData["options"], string]>([
    ["error", null, "No pudimos cargar sucursales y máquinas"],
    ["permission denied", "forbidden", "Tu rol trabaja con toda la cuenta"],
    ["empty", { branches: [], machines: [] }, "Todavía no hay sucursales ni máquinas"],
  ])("shows the %s state of branches and machines", async (_, options, text) => {
    const { dialog } = await open({ options });
    expect(within(dialog).getByText(text, { exact: false })).toBeTruthy();
    expect(within(dialog).queryByLabelText("Sucursal")).toBeNull();
  });

  it("shows the error state when the account list failed", async () => {
    const { dialog } = await open({ accounts: null });
    expect(within(dialog).getByText(/No pudimos cargar tus cuentas/u)).toBeTruthy();
  });
});

describe("FocusLostBanner", () => {
  it("explains the fallback and stores «all» on acknowledgement", async () => {
    const fetch = vi.fn(async () => Response.json({ location: "/files" }));
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("location", { ...window.location, assign: vi.fn() });
    const user = userEvent.setup();
    render(<FocusLostBanner csrfToken="csrf" />);
    expect(screen.getByText(/Ya no tienes acceso a la sucursal o máquina/u)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Entendido" }));
    const body = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(body.get("branchId")).toBe("");
    expect(body.get("machineId")).toBe("");
  });
});
