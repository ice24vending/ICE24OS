// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), query: "", canWrite: true }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/maintenance/tickets",
  useRouter: () => mock,
  useSearchParams: () => new URLSearchParams(mock.query),
}));
vi.mock("../account-shell/access-provider", () => ({
  useAccountAccess: () => ({ canWrite: mock.canWrite, online: true }),
}));
import { TicketsListScreen } from "./list-screen";
import { demoApiResponse } from "../../server/demo/api";
import { defaultDemoState } from "../../server/demo/state";
const props = {
  contextId: "context",
  csrfToken: "csrf",
  permissions: ["maintenance.tickets-read", "maintenance.tickets-create"],
};
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      demoApiResponse(
        url.replace("/api/", ""),
        {},
        defaultDemoState(),
        Date.parse("2026-11-23T18:00:00Z"),
      ),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  localStorage.clear();
  mock.query = "";
  mock.canWrite = true;
});
const loaded = () =>
  waitFor(() => expect(screen.getByRole("main").getAttribute("data-page-ready")).toBe("true"));
describe("tickets list", () => {
  it("renders nine columns and server KPI that do not shrink with pagination", async () => {
    mock.query = "limit=1";
    render(<TicketsListScreen {...props} />);
    expect(screen.getByRole("main").getAttribute("data-page-ready")).toBe("false");
    await loaded();
    expect(screen.getAllByRole("columnheader")).toHaveLength(9);
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /^Abiertos/ }).textContent).not.toContain("Abiertos1");
    expect(screen.getByRole("link", { name: "Más tickets" }).getAttribute("href")).toContain(
      "limit=1&cursor=",
    );
    expect(screen.getByRole("link", { name: "TKT-000001" }).getAttribute("href")).toContain(
      "volver=",
    );
  });
  it("preserves the incoming machine filter and marks a selected KPI accessibly", async () => {
    mock.query = "machineId=c0000000-0000-4000-8000-000000000001&metric=open";
    render(<TicketsListScreen {...props} />);
    await loaded();
    expect(
      (screen.getByRole("combobox", { name: "Máquina" }) as HTMLSelectElement).value,
    ).toContain("0001");
    expect(screen.getByRole("link", { name: /^Abiertos/ }).getAttribute("aria-current")).toBe(
      "true",
    );
    expect(screen.getByText("Filtro activo", { exact: true })).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: "Quitar filtros" }));
    expect(mock.push).toHaveBeenCalledWith("/maintenance/tickets", { scroll: false });
  });
  it("announces only explicit view switches once and hides forbidden creation", async () => {
    render(<TicketsListScreen {...props} permissions={["maintenance.tickets-read"]} />);
    await loaded();
    expect(screen.queryByRole("link", { name: "Reportar una falla" })).toBeNull();
    expect(screen.getByRole("status", { name: "Cambio de vista" }).textContent).toBe("");
    await userEvent.setup().click(screen.getByRole("radio", { name: "Bloques" }));
    expect(screen.getAllByText("Vista de bloques.")).toHaveLength(1);
  });
  it("keeps an incoming machine active even when it has no tickets in the available scope", async () => {
    const machineId = "c0000000-0000-4000-8000-000000000099";
    mock.query = `machineId=${machineId}`;
    render(<TicketsListScreen {...props} />);
    await loaded();
    expect((screen.getByRole("combobox", { name: "Máquina" }) as HTMLSelectElement).value).toBe(
      machineId,
    );
    expect(screen.getByRole("region", { name: "Filtros activos" }).textContent).toContain(
      "Máquina: seleccionada",
    );
    expect(screen.getByText("No hay tickets que coincidan con estos filtros.")).toBeTruthy();
  });
  it("keeps a distinct offline state without requesting data", async () => {
    render(<TicketsListScreen {...props} demoOffline />);
    expect(screen.getByRole("main").getAttribute("data-page-ready")).toBe("true");
    expect(screen.getByText("Necesitas conexión para consultar los tickets.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
});
