// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  usePathname: () => "/machines",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}));
import { EquipmentWorkspace } from "./workspace";
import { MachineHistory } from "./machine-history";
import { createEquipmentClient } from "./configuration-client";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("machine calendar states (UXD-00B)", () => {
  const client = createEquipmentClient("context-a", "csrf-test");
  const entry = {
    id: "schedule-a",
    status: "pending",
    due_at: "2026-10-21T16:00:00Z",
    definition: { name: "Sanitizar depósito" },
  };
  function Calendar() {
    const [attempt, setAttempt] = useState(0);
    return (
      <MachineHistory
        key={attempt}
        machineId="machine-a"
        path="schedules"
        client={client}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    );
  }

  it("shows loading, then only successful emptiness", async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    render(<Calendar />);
    expect(screen.getByText("Cargando la información…")).toBeTruthy();
    expect(screen.queryByText(/Sin registros/)).toBeNull();
    await act(async () => finish(new Response("[]")));
    expect(await screen.findByText(/Sin registros/)).toBeTruthy();
    expect(screen.queryByText("Cargando la información…")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the failure reference without empty data and retries through loading to success", async () => {
    const folio = "c0ffee00-0000-4000-8000-0000000003e7";
    let finish!: (response: Response) => void;
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "DEPENDENCY_UNAVAILABLE",
            message: "No fue posible cargar el calendario.",
            correlationId: folio,
          }),
          { status: 503 },
        ),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      );
    vi.stubGlobal("fetch", fetcher);
    render(<Calendar />);
    expect(await screen.findByText("No fue posible cargar el calendario.")).toBeTruthy();
    expect(screen.getByText(folio)).toBeTruthy();
    expect(screen.queryByText(/Sin registros/)).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(screen.getByText("Cargando la información…")).toBeTruthy();
    expect(screen.queryByText(folio)).toBeNull();
    await act(async () => finish(new Response(JSON.stringify([entry]))));
    expect(await screen.findByText(/Sanitizar depósito/)).toBeTruthy();
    expect(screen.queryByText(/Sin registros|No fue posible/)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("shows offline without also claiming an empty calendar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(<Calendar />);
    expect(await screen.findByText(/Sin conexión\. Necesitas red/)).toBeTruthy();
    expect(screen.queryByText(/Sin registros/)).toBeNull();
  });

  it("ignores a late result after changing the selected machine", async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              finish = resolve;
            }),
        )
        .mockResolvedValueOnce(new Response("[]")),
    );
    const view = render(
      <MachineHistory
        key="a"
        machineId="machine-a"
        path="schedules"
        client={client}
        onRetry={() => undefined}
      />,
    );
    view.rerender(
      <MachineHistory
        key="b"
        machineId="machine-b"
        path="schedules"
        client={client}
        onRetry={() => undefined}
      />,
    );
    expect(await screen.findByText(/Sin registros/)).toBeTruthy();
    await act(async () => finish(new Response(JSON.stringify([entry]))));
    expect(screen.queryByText(/Sanitizar depósito/)).toBeNull();
    expect(screen.getByText(/Sin registros/)).toBeTruthy();
  });
});

describe("equipment workspace refresh", () => {
  it.each([
    ["account", ["Mi cuenta", "Usuarios", "Transferencias", "Componentes y frecuencias"]],
    ["ice24", ["Catálogos y plantillas", "Validaciones", "Cuentas ICE24", "Panel ICE24"]],
  ] as const)(
    "keeps %s tabs and loading paths independent of the machine overview",
    async (section, titles) => {
      const reads: string[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
          const path = new URL(url, "http://local").searchParams.get("path")!;
          reads.push(path);
          return Response.json(
            path === "equipment-workspace"
              ? {
                  accessMode: "ACTIVE",
                  canManage: true,
                  canAdmin: true,
                  hasMfa: true,
                  accountWide: true,
                  accountId: "account-a",
                  configuration: {
                    accountCatalog: true,
                    accountFrequencies: "edit",
                    machineBranches: "ALL",
                  },
                }
              : [],
          );
        }),
      );
      render(<EquipmentWorkspace csrfToken="csrf" contextId="context-a" section={section} />);
      await screen.findByText(/Actualizado a las/);
      expect(
        within(screen.getByRole("navigation", { name: "Secciones" }))
          .getAllByRole("button")
          .map((button) => button.textContent?.trim()),
      ).toEqual(titles);
      expect(reads).not.toContain("machines/overview");
      expect(reads).toContain(section === "account" ? "accounts/account-a" : "technical-models");
    },
  );
  it("refreshes from the page header, reports progress and the update time", async () => {
    const reads: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const path = new URL(url, "http://local").searchParams.get("path")!;
        reads.push(path);
        const body =
          path === "equipment-workspace"
            ? { accessMode: "ACTIVE", canManage: false, hasMfa: true, accountId: "a" }
            : [];
        return new Response(JSON.stringify(body), { status: 200 });
      }),
    );
    render(<EquipmentWorkspace csrfToken="csrf" contextId="context-a" section="machines" />);
    const header = document.querySelector("main header")!;
    const refresh = screen.getByRole("button", { name: /Actualizar datos/ });
    expect(header.contains(refresh)).toBe(true);
    expect(refresh.getAttribute("aria-busy")).toBe("true");
    expect(await screen.findByText(/Actualizado a las/)).toBeTruthy();
    expect(refresh.getAttribute("aria-busy")).toBe("false");

    const before = reads.filter((path) => path === "equipment-workspace").length;
    await userEvent.setup().click(refresh);
    await waitFor(() =>
      expect(reads.filter((path) => path === "equipment-workspace").length).toBe(before + 1),
    );
    expect(screen.getAllByRole("button", { name: /Actualizar datos/ })).toHaveLength(1);
  });
});
