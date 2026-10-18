// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoAxeViolations } from "./axe.test-utils.js";
import { StatusTag } from "./badge.js";
import { Button } from "./button.js";
import { EmptyState, Table, type TableColumn } from "./table.js";

afterEach(cleanup);

interface Machine {
  readonly code: string;
  readonly branch: string;
  readonly cycles: number;
}

/** Test rows (not product data). */
const ROWS: readonly Machine[] = [
  { code: "M-002", branch: "Sucursal B", cycles: 40 },
  { code: "M-001", branch: "Sucursal A", cycles: 125 },
  { code: "M-010", branch: "Sucursal C", cycles: 7 },
];

const COLUMNS: readonly TableColumn<Machine>[] = [
  {
    id: "code",
    header: "Máquina",
    cell: (row) => row.code,
    sortValue: (row) => row.code,
    mono: true,
    mobile: "title",
  },
  { id: "branch", header: "Sucursal", cell: (row) => row.branch },
  {
    id: "cycles",
    header: "Ciclos",
    cell: (row) => row.cycles,
    sortValue: (row) => row.cycles,
    numeric: true,
  },
];

const codes = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0]?.textContent);

describe("Table", () => {
  it("has a caption, column headers and one row per record", () => {
    render(<Table caption="Máquinas" columns={COLUMNS} rows={ROWS} getRowId={(row) => row.code} />);
    expect(screen.getByRole("table", { name: "Máquinas" })).toBeDefined();
    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Máquina",
      "Sucursal",
      "Ciclos",
    ]);
    expect(codes()).toEqual(["M-002", "M-001", "M-010"]);
    expect(screen.getAllByRole("cell")[0]?.className).toContain("ids-table__cell--mono");
    expect(screen.getAllByRole("cell")[1]?.getAttribute("data-label")).toBe("Sucursal");
  });

  it("sorts from the keyboard and reports it with aria-sort", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <Table
        caption="Máquinas"
        columns={COLUMNS}
        rows={ROWS}
        getRowId={(row) => row.code}
        onSortChange={onSortChange}
      />,
    );
    const header = screen.getByRole("columnheader", { name: /Ciclos/ });
    expect(header.getAttribute("aria-sort")).toBeNull();
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(within(header).getByRole("button"));
    await user.keyboard("{Enter}");
    expect(header.getAttribute("aria-sort")).toBe("ascending");
    expect(codes()).toEqual(["M-010", "M-002", "M-001"]);
    await user.keyboard(" ");
    expect(header.getAttribute("aria-sort")).toBe("descending");
    expect(codes()).toEqual(["M-001", "M-002", "M-010"]);
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: "cycles", direction: "descending" });
  });

  it("leaves the order to the API in server mode", async () => {
    const user = userEvent.setup();
    render(
      <Table
        caption="Máquinas"
        columns={COLUMNS}
        rows={ROWS}
        getRowId={(row) => row.code}
        sortMode="server"
      />,
    );
    await user.click(screen.getByRole("button", { name: /Máquina/ }));
    expect(codes()).toEqual(["M-002", "M-001", "M-010"]);
  });

  it("selects rows one by one and all at once", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <Table
        caption="Máquinas"
        columns={COLUMNS}
        rows={ROWS}
        getRowId={(row) => row.code}
        getRowLabel={(row) => row.code}
        selectable
        onSelectionChange={onSelectionChange}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Seleccionar M-001" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["M-001"]);
    const all = screen.getByRole("checkbox", {
      name: "Seleccionar todas las filas",
    }) as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    expect(screen.getByRole("status").textContent).toBe("1 fila seleccionada");
    await user.click(all);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["M-002", "M-001", "M-010"]);
    expect(screen.getByRole("status").textContent).toBe("3 filas seleccionadas");
  });

  it("shows loading, empty and error states", () => {
    const { container, rerender } = render(
      <Table caption="Máquinas" columns={COLUMNS} rows={[]} getRowId={(row) => row.code} loading />,
    );
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Cargando máquinas…");
    rerender(
      <Table
        caption="Máquinas"
        columns={COLUMNS}
        rows={[]}
        getRowId={(row) => row.code}
        empty={<EmptyState title="Todavía no hay máquinas" />}
      />,
    );
    expect(screen.getByText("Todavía no hay máquinas")).toBeDefined();
    rerender(
      <Table
        caption="Máquinas"
        columns={COLUMNS}
        rows={ROWS}
        getRowId={(row) => row.code}
        error={<p>No fue posible cargar las máquinas.</p>}
      />,
    );
    expect(screen.getByText("No fue posible cargar las máquinas.")).toBeDefined();
    expect(screen.queryByText("M-001")).toBeNull();
  });

  it("has no axe violations with selection, actions, tags and footer", async () => {
    const { container } = render(
      <Table
        caption="Máquinas"
        columns={[
          ...COLUMNS,
          {
            id: "state",
            header: "Operación",
            cell: () => (
              <StatusTag tone="success" dimension="Operación">
                Disponible
              </StatusTag>
            ),
          },
        ]}
        rows={ROWS}
        getRowId={(row) => row.code}
        selectable
        rowActions={(row) => (
          <Button variant="tertiary" size="sm" aria-label={`Ver ${row.code}`}>
            Ver
          </Button>
        )}
        footer={<p>3 máquinas</p>}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
