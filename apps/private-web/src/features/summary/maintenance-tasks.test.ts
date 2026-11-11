import { expect, it } from "vitest";
import type { WorkOrder, ScheduledActivity } from "@ice24/contracts";
import { demoOrderDefinition } from "../../server/demo/work-order-fixtures";
import { maintenanceTasks } from "./maintenance-tasks";
const order = (
  id: string,
  state: WorkOrder["state"],
  dueAt: string | null,
  assigneeId = "ana",
): WorkOrder => ({
  id,
  folio: id,
  state,
  dueAt,
  assigneeId,
  assigneeName: "Ana Torres",
  machineId: "machine",
  machineCode: "ICE24",
  branchId: "branch",
  sourceType: "ticket",
  sourceId: "ticket",
  ticketId: "ticket",
  activityId: null,
  templateId: "template",
  templateVersion: 1,
  definition: demoOrderDefinition,
  alertAt: null,
  rowVersion: 1,
  createdAt: "2026-11-10T00:00:00Z",
});
it("prioritizes overdue and reviews with stable due date ties, excludes terminal orders and limits to five", () => {
  const rows = [
    order("closed", "completed", null),
    order("review", "nonconforming", null),
    ...Array.from({ length: 6 }, (_, i) =>
      order(`due${i}`, "overdue", `2026-11-${10 + i}T00:00:00Z`),
    ),
  ];
  expect(maintenanceTasks(rows, []).map((x) => x.id)).toEqual([
    "due0",
    "due1",
    "due2",
    "due3",
    "due4",
  ]);
});
it("technicians only see their assigned orders, not unassigned activities", () => {
  expect(
    maintenanceTasks(
      [order("own", "in_progress", null), order("other", "overdue", null, "other")],
      [],
      "ana",
    ).map((x) => x.id),
  ).toEqual(["own"]);
});
it("includes unassigned critical activities for supervision and excludes completed activities", () => {
  const activity: ScheduledActivity = {
    id: "act",
    machineId: "machine",
    branchId: "branch",
    machineCode: "ICE24",
    machineName: "Máquina",
    branchName: "Centro",
    activityCode: "ACT",
    name: "Limpiar",
    state: "critical",
    dueAt: null,
    alertAt: null,
    timezone: "America/Mexico_City",
    assigneeId: null,
    rowVersion: 1,
  };
  expect(
    maintenanceTasks(
      [order("order", "overdue", null)],
      [activity, { ...activity, id: "done", state: "completed" }],
    ).map((x) => x.id),
  ).toEqual(["act", "order"]);
});
