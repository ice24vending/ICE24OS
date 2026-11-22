// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { OperationalChart } from "./operational-chart.js";
afterEach(cleanup);
it.each(["stacked", "bars", "columns"] as const)(
  "%s exposes every exact value in a named table and labels the visual marks",
  (variant) => {
    render(
      <OperationalChart
        title="Máquinas"
        summary="3 necesitan atención"
        variant={variant}
        items={[
          { label: "Disponible", value: 5, tone: "success" },
          { label: "En mantenimiento", value: 2 },
          { label: "Fuera de servicio", value: 1, tone: "danger" },
        ]}
      />,
    );
    const table = screen.getByRole("table", { name: "Máquinas: datos" });
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByRole("row", { name: "En mantenimiento 2" })).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(document.querySelector('[aria-hidden="true"]')?.textContent).toContain(
      "2 En mantenimiento",
    );
  },
);
it("distinguishes an unavailable source from a confirmed zero and handles long labels", () => {
  const view = render(
    <OperationalChart title="Órdenes" summary="Consulta no disponible" items={null} />,
  );
  expect(screen.getByText("Sin datos")).toBeTruthy();
  expect(screen.queryByRole("table")).toBeNull();
  view.rerender(
    <OperationalChart
      title="Órdenes"
      summary="Sin pendientes"
      items={[{ label: "Responsable con nombre largo", value: 0 }]}
    />,
  );
  expect(screen.queryByText("Sin datos")).toBeNull();
  expect(screen.getByText("No hay registros en este periodo.")).toBeTruthy();
  expect(screen.getByRole("cell", { name: "0" })).toBeTruthy();
  expect(document.querySelector("rect")?.getAttribute("width")).toBe("0");
});
