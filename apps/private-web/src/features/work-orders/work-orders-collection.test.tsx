// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { WorkOrder } from "@ice24/contracts";
import { demoOrderDefinition } from "../../server/demo/work-order-fixtures";
import { RoutedWorkOrdersCollection, byAttention, orderGroup } from "./work-orders-collection";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  usePathname: () => "/maintenance/work-orders",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));
beforeEach(() => {
  search = "";
  localStorage.clear();
});
afterEach(cleanup);

const order = (folio: string, state: WorkOrder["state"], extra: Partial<WorkOrder> = {}) =>
  ({
    id: `id-${folio}`,
    folio,
    machineId: "m",
    machineCode: "ICE24-001",
    branchId: "b",
    sourceType: "activity",
    sourceId: "s",
    ticketId: null,
    activityId: "a",
    assigneeId: "u",
    assigneeName: "Ana Torres",
    templateId: "t",
    templateVersion: 1,
    definition: demoOrderDefinition,
    state,
    dueAt: "2026-11-10T18:00:00.000Z",
    alertAt: null,
    rowVersion: 1,
    createdAt: "2026-11-03T16:00:00.000Z",
    ...extra,
  }) as WorkOrder;
const critical = { ...demoOrderDefinition, criticality: "critical" as const };
const items = [
  order("OT-6", "completed"),
  order("OT-5", "in_progress"),
  order("OT-4", "scheduled"),
  order("OT-3", "upcoming"),
  order("OT-2", "overdue"),
  order("OT-1", "scheduled", { definition: critical }),
  order("OT-7", "cancelled", { definition: critical }),
].sort(byAttention);

it("orders by attention; a critical activity only leads while the order is open", () => {
  expect(items.map((o) => o.folio)).toEqual([
    "OT-1",
    "OT-2",
    "OT-3",
    "OT-4",
    "OT-5",
    "OT-6",
    "OT-7",
  ]);
  expect(orderGroup(items.at(-1)!)).toBe(5);
});

it("lists one sortable table per non-empty group with its count", () => {
  render(<RoutedWorkOrdersCollection items={items.slice(0, 3)} actions={() => null} />);
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
    "Críticas · 1 orden",
    "Vencidas · 1 orden",
    "Próximas · 1 orden",
  ]);
  const table = screen.getByRole("table", { name: "Críticas: 1 orden" });
  expect(within(table).getByRole("link", { name: "OT-1" }).getAttribute("href")).toBe(
    "/maintenance/work-orders/id-OT-1",
  );
  expect(within(table).getByText("Crítica")).toBeTruthy();
});

it("shows the board as a list of lists with the closed column folded", async () => {
  search = "vista=bloques";
  const user = userEvent.setup();
  render(<RoutedWorkOrdersCollection items={items} actions={() => null} />);
  const board = screen.getByRole("list", { name: "Tablero de órdenes" });
  const columns = within(board).getAllByRole("heading", { level: 2 });
  expect(columns.map((h) => h.textContent)).toEqual([
    "Críticas · 1 orden",
    "Vencidas · 1 orden",
    "Próximas · 1 orden",
    "Programadas · 1 orden",
    "En atención · 1 orden",
    "En revisión y cerradas · 2 órdenes",
  ]);
  expect(screen.queryByRole("link", { name: "OT-6" })).toBeNull();
  const toggle = screen.getByRole("button", { name: "En revisión y cerradas · 2 órdenes" });
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  await user.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByRole("link", { name: "OT-6" })).toBeTruthy();
  expect(screen.getByRole("radio", { name: "Tablero" })).toHaveProperty("checked", true);
});
