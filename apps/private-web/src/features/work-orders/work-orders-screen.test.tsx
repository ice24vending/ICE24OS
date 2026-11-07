// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { WorkOrderDetail } from "@ice24/contracts";
import { demoOrderDefinition } from "../../server/demo/work-order-fixtures";
import { WorkOrdersScreen } from "./work-orders-screen";

afterEach(cleanup);
const detail: WorkOrderDetail = {
  order: {
    id: "order-1",
    folio: "OT-000001",
    machineId: "machine-1",
    machineCode: "ICE24-001",
    branchId: "branch-1",
    sourceType: "ticket",
    sourceId: "ticket-1",
    ticketId: "ticket-1",
    activityId: null,
    assigneeId: "technician-1",
    assigneeName: "Técnico asignado",
    templateId: "template-1",
    templateVersion: 1,
    definition: demoOrderDefinition,
    state: "scheduled",
    dueAt: null,
    alertAt: null,
    rowVersion: 1,
    createdAt: "2026-11-03T16:00:00.000Z",
  },
  events: [],
  canReassign: false,
  actions: [
    { action: "start", allowed: false, message: "No tienes permiso para esta acción." },
    { action: "expire", allowed: false, message: "La fecha límite aún no se supera." },
  ],
};
it("shows filters on first load without an active filter", () => {
  render(<WorkOrdersScreen mode="list" contextId="context" csrfToken="csrf" items={[]} />);
  expect(screen.getByText("Filtros de órdenes").closest("details")?.open).toBe(true);
  expect(
    within(screen.getByRole("form", { name: "Filtrar órdenes" })).getAllByRole("combobox"),
  ).toHaveLength(4);
});
it("offers consultation instead of a blocked start and associates each administrative guard", () => {
  render(<WorkOrdersScreen mode="detail" contextId="context" csrfToken="csrf" detail={detail} />);
  expect(screen.getByRole("complementary", { name: "Modo consulta" }).textContent).toContain(
    "Solo el técnico asignado",
  );
  expect(screen.queryByRole("button", { name: "Iniciar orden" })).toBeNull();
  expect(
    screen
      .getByRole("link", { name: "Consultar ejecución" })
      .classList.contains("ids-button--primary"),
  ).toBe(true);
  const button = within(
    screen.getByRole("region", { name: "Administración del estado" }),
  ).getByRole("button", { name: "Marcar vencido" });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(document.getElementById(button.getAttribute("aria-describedby")!)?.textContent).toBe(
    "La fecha límite aún no se supera.",
  );
});
it("gives an allowed start primary priority while consultation remains secondary", () => {
  render(
    <WorkOrdersScreen
      mode="detail"
      contextId="context"
      csrfToken="csrf"
      detail={{ ...detail, actions: [{ action: "start", allowed: true, message: "" }] }}
    />,
  );
  const start = screen.getByRole("button", { name: "Iniciar orden" });
  expect((start as HTMLButtonElement).disabled).toBe(false);
  expect(start.classList.contains("ids-button--primary")).toBe(true);
  expect(
    screen
      .getByRole("link", { name: "Consultar ejecución" })
      .classList.contains("ids-button--secondary"),
  ).toBe(true);
  expect(screen.queryByRole("complementary", { name: "Modo consulta" })).toBeNull();
});
