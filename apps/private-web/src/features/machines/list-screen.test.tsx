// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
const navigation = vi.hoisted(() => ({ replace: vi.fn(), query: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/machines",
  useSearchParams: () => new URLSearchParams(navigation.query),
  useRouter: () => navigation,
}));
import { MachineList } from "./list-screen";
import { DemoRequest } from "../../server/demo/api";
import { machineOverview } from "../../server/demo/machines";
import { defaultDemoState } from "../../server/demo/state";
const rows = machineOverview(
  new DemoRequest(defaultDemoState(), Date.parse("2026-11-22T18:00:00Z")),
);
const props = {
  rows,
  loading: false,
  updatedAt: "12:00",
  refresh: vi.fn(),
  navigation: <nav aria-label="Secciones" />,
};
afterEach(() => {
  cleanup();
  localStorage.clear();
  navigation.query = "";
  vi.clearAllMocks();
});
describe("machine list", () => {
  it("shows seven sortable columns, linked rows, textual states and no embedded editing", () => {
    render(<MachineList {...props} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
    for (const name of [
      "Folio",
      "Nombre",
      "Sucursal",
      "Estado operativo",
      "Último mantenimiento",
      "Próximo mantenimiento",
      "Tickets abiertos",
    ])
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeTruthy();
    expect(screen.getByRole("link", { name: rows[0]!.machine_code }).getAttribute("href")).toBe(
      `/machines/${rows[0]!.id}`,
    );
    expect(screen.getByText("Fuera de servicio", { selector: ".ids-tag" })).toBeTruthy();
    expect(screen.getByText("Sin registro")).toBeTruthy();
    expect(screen.queryByText("Ver / editar")).toBeNull();
    expect(document.querySelector(".machine-record")).toBeNull();
    expect(screen.getByRole("main").getAttribute("data-page-ready")).toBe("true");
  });
  it("announces explicit view changes once, and restores the view silently", async () => {
    const user = userEvent.setup();
    const view = render(<MachineList {...props} />);
    expect(screen.getByRole("status", { name: "Cambio de vista" }).textContent).toBe("");
    await user.click(screen.getByRole("radio", { name: "Bloques" }));
    expect(screen.getAllByText("Vista de bloques.")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Máquinas en bloques" })).toBeTruthy();
    expect(screen.getByRole("link", { name: rows[0]!.name }).getAttribute("href")).toBe(
      `/machines/${rows[0]!.id}`,
    );
    view.unmount();
    render(<MachineList {...props} />);
    expect((screen.getByRole("radio", { name: "Bloques" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("status", { name: "Cambio de vista" }).textContent).toBe("");
  });
  it("preserves filters in URL when sorting and changing view", async () => {
    navigation.query = `q=Juarez&sucursalFiltro=${rows[0]!.branch_id}&estado=available`;
    render(<MachineList {...props} />);
    expect(screen.getAllByRole("row")).toHaveLength(2);
    await userEvent.setup().click(screen.getByRole("button", { name: /Tickets abiertos/ }));
    expect(navigation.replace).toHaveBeenLastCalledWith(
      expect.stringContaining("estado=available&orden=tickets"),
      { scroll: false },
    );
    await userEvent.setup().click(screen.getByRole("radio", { name: "Bloques" }));
    expect(navigation.replace).toHaveBeenLastCalledWith(
      expect.stringContaining("estado=available&vista=bloques"),
      { scroll: false },
    );
  });
  it("separates loading, failed, offline and successful empty states", async () => {
    const view = render(<MachineList {...props} rows={[]} loading />);
    expect(screen.getByRole("main").getAttribute("data-page-ready")).toBe("false");
    expect(screen.queryByText("Sin máquinas")).toBeNull();
    view.rerender(
      <MachineList
        {...props}
        rows={[]}
        failure={{
          kind: "error",
          status: 503,
          message: "Error de consulta",
          correlationId: "c0ffee00-0000-4000-8000-0000000003e7",
        }}
      />,
    );
    expect(screen.getByText("c0ffee00-0000-4000-8000-0000000003e7")).toBeTruthy();
    expect(screen.queryByText("Sin máquinas")).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(props.refresh).toHaveBeenCalledTimes(1);
    view.rerender(
      <MachineList
        {...props}
        rows={[]}
        failure={{ kind: "offline", status: 0, message: "Sin conexión" }}
      />,
    );
    expect(screen.queryByText("Sin máquinas")).toBeNull();
    view.rerender(<MachineList {...props} rows={[]} />);
    expect(screen.getByText("Sin máquinas")).toBeTruthy();
  });
});
