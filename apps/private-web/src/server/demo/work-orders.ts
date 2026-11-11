import {
  workOrderDetailSchema,
  workOrderOptionsSchema,
  workOrderPageSchema,
  workOrderQuerySchema,
  workOrderSchema,
  workOrderExecutionDetailSchema,
  type WorkOrder,
} from "@ice24/contracts";
import { evaluateWorkOrderTransition, workOrderTransitions } from "@ice24/domain";
import type { DemoRequest } from "./api";
import { demoIds, demoUserId } from "./fixtures";
import { demoOrderDefinition, demoExecutionDefinition } from "./work-order-fixtures";
import { demoOfflinePackages, demoOfflineKey, demoReleasedLeases } from "./offline-state";
export function demoWorkOrders(request: DemoRequest): WorkOrder[] {
  const states = [
    "scheduled",
    "upcoming",
    "overdue",
    "in_progress",
    "completed",
    "with_observations",
    "nonconforming",
    "corrected",
    "cancelled",
  ] as const;
  return request.machines
    .flatMap((machine) =>
      states.map((state, index) =>
        workOrderSchema.parse({
          id: demoIds.job(
            2000 +
              request.account.machines.indexOf(machine) * 10 +
              index +
              (request.state.account === "bajio" ? 1000 : 0),
          ),
          folio: `OT-${String(request.account.machines.indexOf(machine) * 10 + index + 1).padStart(6, "0")}`,
          machineId: machine.id,
          machineCode: machine.code,
          branchId: machine.branchId,
          sourceType: "ticket",
          sourceId: demoIds.request(
            900 +
              request.account.machines.indexOf(machine) +
              (request.state.account === "bajio" ? 100 : 0),
          ),
          ticketId: demoIds.request(
            900 +
              request.account.machines.indexOf(machine) +
              (request.state.account === "bajio" ? 100 : 0),
          ),
          activityId: null,
          assigneeId: demoUserId("technician"),
          assigneeName: "Ana Torres",
          templateId: demoIds.catalog(10),
          templateVersion: 1,
          definition: index === 3 || index === 4 ? demoExecutionDefinition : demoOrderDefinition,
          state,
          dueAt: "2026-11-10T18:00:00.000Z",
          alertAt: "2026-11-03T18:00:00.000Z",
          rowVersion: 1,
          createdAt: "2026-11-03T16:00:00.000Z",
        }),
      ),
    )
    .map((order) => demoOfflinePackages.get(demoOfflineKey(request, order.id))?.order ?? order);
}
export function demoWorkOrdersResponse(
  request: DemoRequest,
  route: string,
  params: URLSearchParams,
): Response {
  const json = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: { "cache-control": "no-store" } });
  if (!request.can("maintenance.orders-read")) return json({}, 403);
  const orders = demoWorkOrders(request);
  if (route.startsWith("work-orders/options/")) {
    if (!request.can("maintenance.orders-assign")) return json({}, 403);
    const [, , sourceType, sourceId] = route.split("/");
    const machine =
      sourceType === "ticket"
        ? request.machines.find(
            (m) =>
              demoIds.request(
                900 +
                  request.account.machines.indexOf(m) +
                  (request.state.account === "bajio" ? 100 : 0),
              ) === sourceId,
          )
        : request.machines.find((_, index) =>
            Array.from({ length: 6 }, (_, n) => demoIds.job(500 + index * 10 + n)).includes(
              sourceId ?? "",
            ),
          );
    if (!machine) return json({}, 404);
    return json(
      workOrderOptionsSchema.parse({
        sourceType,
        sourceId,
        rowVersion: sourceType === "ticket" ? 2 : 1,
        machineId: machine.id,
        machineCode: machine.code,
        existingOrderId: null,
        technicians:
          request.state.maintenance === "empty"
            ? []
            : [{ id: demoUserId("technician"), name: "Ana Torres" }],
        activities: [demoOrderDefinition],
      }),
    );
  }
  if (route === "work-orders") {
    const query = workOrderQuerySchema.safeParse(Object.fromEntries(params));
    if (!query.success) return json({}, 400);
    const q = query.data;
    const rows =
      request.state.maintenance === "empty" || q.view === "downloaded"
        ? []
        : orders
            .filter(
              (o) =>
                (!q.state || q.state === o.state) &&
                (!q.machineId || q.machineId === o.machineId) &&
                (!q.assigneeId || q.assigneeId === o.assigneeId) &&
                (!q.cursor || o.id > q.cursor) &&
                (q.view !== "pending" || ["scheduled", "upcoming", "overdue"].includes(o.state)),
            )
            .sort((a, b) => a.id.localeCompare(b.id));
    const items = rows.slice(0, q.limit);
    return json(
      workOrderPageSchema.parse({
        items,
        nextCursor: rows.length > q.limit ? items.at(-1)!.id : null,
      }),
    );
  }
  const order = orders.find((o) => o.id === route.split("/")[1]);
  if (!order) return json({}, 404);
  if (route.endsWith("/execution")) {
    const captured =
      ["completed", "with_observations", "nonconforming", "corrected"].includes(order.state) ||
      request.state.maintenance === "downloaded";
    const closed = ["completed", "with_observations", "nonconforming", "corrected"].includes(
      order.state,
    );
    return json(
      workOrderExecutionDetailSchema.parse({
        revisions:
          request.state.maintenance === "empty"
            ? []
            : [
                {
                  id: demoIds.job(9000),
                  version: 1,
                  kind: closed ? "closure" : "draft",
                  actorId: order.assigneeId,
                  createdAt: "2026-11-03T18:00:00.000Z",
                  reason: "Registro de demostración",
                  execution: {
                    checklist: captured ? order.definition.checklist.map((item) => item.code) : [],
                    fields: {},
                    diagnosis: "Filtro obstruido",
                    activitiesPerformed: "Se reemplazó el filtro",
                    parts: [],
                    tests: "Caudal y temperatura verificados",
                    recommendation: "Revisar en 30 días",
                    result: "conforming",
                    followup: "",
                    evidence: captured
                      ? [
                          ...[1, 2].map((n) => ({
                            type: "photo",
                            requirementCode: order.definition.evidenceRules.requirements
                              ? n === 1
                                ? "before"
                                : "after"
                              : "legacy",
                            fileId: demoIds.job(9100 + n),
                            fileVersionId: demoIds.job(9200 + n),
                          })),
                          ...(order.definition.evidenceRules.requirements
                            ? [
                                {
                                  type: "reading",
                                  requirementCode: "temperature",
                                  value: 2,
                                  unit: "°C",
                                },
                                { type: "lot", requirementCode: "lot", value: "LOT-26-04" },
                                {
                                  type: "signature",
                                  requirementCode: "signature",
                                  name: "Ana Torres",
                                  confirmed: true,
                                },
                              ]
                            : []),
                        ]
                      : [],
                  },
                },
              ],
        reviews: [],
        missing: [],
        outOfRange: [],
        canExecute:
          request.authorize("maintenance.orders-execute", "WRITE").allowed &&
          request.subject.userId === order.assigneeId &&
          order.state === "in_progress",
        canReview: request.authorize("maintenance.orders-review", "WRITE").allowed && closed,
        canRequestCorrection:
          request.authorize("maintenance.orders-execute", "WRITE").allowed &&
          request.subject.userId === order.assigneeId &&
          closed,
        canReopen: request.authorize("maintenance.orders-review", "WRITE").allowed && closed,
      }),
    );
  }
  const actions = workOrderTransitions
    .filter((t) => t.from === order.state)
    .map((t) => {
      const permission = ["correct", "cancel", "reopen"].includes(t.action)
        ? "maintenance.orders-review"
        : ["notify", "expire"].includes(t.action)
          ? "maintenance.orders-assign"
          : "maintenance.orders-execute";
      const result = evaluateWorkOrderTransition(t.action, {
        state: order.state,
        version: 1,
        expectedVersion: 1,
        permitted: request.authorize(permission, "WRITE").allowed,
        assignedToActor: request.subject.userId === order.assigneeId,
        assigneeActive: true,
        now: request.now,
        alertAt: Date.parse(order.alertAt!),
        dueAt: Date.parse(order.dueAt!),
        reason: "Motivo de demostración",
        executionComplete: false,
        evidenceComplete: false,
        result: null,
        followupRecorded: false,
        correctionRecorded: false,
        cancellationRecorded: false,
        reopeningRecorded: false,
      });
      return {
        action: t.action,
        allowed: result.allowed,
        message: result.allowed ? "" : result.message,
      };
    });
  return json(
    workOrderDetailSchema.parse({
      order,
      actions,
      offlineLease: demoOfflinePackages.get(demoOfflineKey(request, order.id))?.lease ?? null,
      canReleaseOffline:
        request.authorize("maintenance.orders-assign", "WRITE").allowed &&
        !!demoOfflinePackages.get(demoOfflineKey(request, order.id)) &&
        !demoReleasedLeases.has(
          demoOfflinePackages.get(demoOfflineKey(request, order.id))!.lease.id,
        ),
      canReassign:
        request.authorize("maintenance.orders-assign", "WRITE").allowed &&
        ["scheduled", "upcoming", "overdue"].includes(order.state),
      events: [
        {
          id: demoIds.audit(2000),
          operation: "WorkOrderCreated",
          reason: "Asignación de demostración — sin cambios reales",
          state: order.state,
          occurredAt: order.createdAt,
        },
      ],
    }),
  );
}
