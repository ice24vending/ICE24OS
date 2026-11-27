// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { ScheduledActivity } from "@ice24/contracts";
import { MaintenanceCalendar } from "./maintenance-calendar";
afterEach(cleanup);
const item: ScheduledActivity = {
  id: "activity",
  machineId: "machine",
  branchId: "branch",
  machineCode: "ICE24-MTY-0001",
  machineName: "Máquina de acceso principal",
  branchName: "Centro Monterrey",
  activityCode: "MNT-1",
  name: "Revisar conexión de la válvula de entrada",
  state: "critical",
  dueAt: "2026-10-20T16:00:00Z",
  alertAt: "2026-10-19T16:00:00Z",
  timezone: "America/Mexico_City",
  assigneeId: null,
  rowVersion: 1,
};
it("capitalizes only the date initial, exposes full text and uses a compact day table", () => {
  render(<MaintenanceCalendar items={[item]} today="2026-10-20" canAssign partial={false} />);
  expect(screen.getByRole("heading", { name: "Octubre de 2026" })).toBeTruthy();
  expect(
    screen.getByRole("heading", { name: "Martes, 20 de octubre · 1 actividades" }),
  ).toBeTruthy();
  expect(
    screen.getByTitle(`${item.machineCode} · ${item.machineName} · ${item.name} · Crítica`),
  ).toBeTruthy();
  expect(screen.getByRole("table", { name: "Actividades del día seleccionado" })).toBeTruthy();
  expect(screen.getAllByRole("link", { name: "Asignar técnico" }).length).toBeGreaterThan(0);
});
it("announces each view once and hides unauthorized assignment", () => {
  render(
    <MaintenanceCalendar items={[item]} today="2026-10-20" canAssign={false} partial={false} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Día" }));
  const calendar = screen.getByRole("region", { name: "Calendario de actividades" });
  expect(within(calendar).getByText("Vista: Día. Martes, 20 de octubre de 2026.")).toBeTruthy();
  expect(screen.getAllByText("Vista: Día. Martes, 20 de octubre de 2026.")).toHaveLength(1);
  expect(screen.queryByRole("link", { name: "Asignar técnico" })).toBeNull();
});
