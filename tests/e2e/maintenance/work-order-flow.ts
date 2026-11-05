import { expect, type Page } from "@playwright/test";
import type { WorkOrder } from "../../../packages/contracts/src/private/maintenance/work-orders";
import { demoOrderDefinition } from "../../../apps/private-web/src/server/demo/work-order-fixtures";
import { demoUserId, demoIds } from "../../../apps/private-web/src/server/demo/fixtures";
/** Browser boundary double. PostgreSQL suite separately verifies real assignment and atomic audit. */
export async function assignDemoWorkOrder(page: Page) {
  const order: WorkOrder = {
    id: demoIds.job(2000),
    folio: "OT-000001",
    machineId: demoIds.machine(1),
    machineCode: "ICE24-MTY-0001",
    branchId: demoIds.branch(1),
    sourceType: "ticket",
    sourceId: demoIds.request(900),
    ticketId: demoIds.request(900),
    activityId: null,
    assigneeId: demoUserId("technician"),
    assigneeName: "Técnico de demostración",
    templateId: demoIds.template(1),
    templateVersion: 1,
    definition: demoOrderDefinition,
    state: "scheduled",
    dueAt: null,
    alertAt: null,
    rowVersion: 1,
    createdAt: "2026-11-03T16:00:00.000Z",
  };
  await page.route("**/api/work-orders", (route) => route.fulfill({ status: 201, json: order }));
  await expect(page.locator('[data-work-orders-ready="true"]')).toBeVisible();
  await page.getByLabel("Técnico responsable").selectOption(demoUserId("technician"));
  await page.getByLabel("Actividad de la plantilla").selectOption("MNT-1");
  await page.getByLabel("Motivo").fill("Revisar falla reportada durante el turno");
  await page.getByRole("button", { name: "Crear orden y asignar" }).click();
  await expect(page.getByRole("heading", { name: "Orden guardada" })).toBeVisible();
  return order;
}
