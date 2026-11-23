import type { MachineOverview } from "@ice24/contracts";
import type { DemoRequest } from "./api";
import { at } from "./fixtures";

/** Local to this list: keep the established detail, account and administration fixtures intact. */
export function machineOverview(request: DemoRequest): MachineOverview[] {
  if (request.state.scenario === "empty") return [];
  const lastDays = [-14, -32, -6, -61, null, -20, -2, -45];
  const nextDays = [7, -3, 1, -9, null, 21, 0, 4];
  const tickets = [0, 2, 1, 3, 0, 0, 2, 1];
  return request.machines.map((machine) => {
    // Use the account index, so changing role/scope never changes a machine's numbers.
    const index = request.account.machines.findIndex((row) => row.id === machine.id);
    const last = lastDays[index % lastDays.length];
    const next = nextDays[index % nextDays.length];
    return {
      id: machine.id,
      machine_code: machine.code,
      name: machine.name,
      serialNumber: `DEMO-${Number.parseInt(machine.id.slice(-12), 16).toString().padStart(4, "0")}`,
      branch_id: machine.branchId,
      branchName: request.account.branches.find((branch) => branch.id === machine.branchId)!.name,
      operational_status: machine.status,
      lastMaintenanceAt: last == null ? null : at(request.now, last),
      nextMaintenanceAt: next == null ? null : at(request.now, next),
      openTickets: tickets[index % tickets.length]!,
    };
  });
}
