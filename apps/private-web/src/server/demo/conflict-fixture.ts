import type { SynchronizationConflict, WorkOrder } from "@ice24/contracts";
import { demoIds, demoUserId } from "./fixtures";
/** Fictional immutable comparison for the catalog; real demo conflicts use the sync endpoint. */
export function conflictFixture(order: WorkOrder): SynchronizationConflict {
  const execution = {
    checklist: ["ISOLATE", "FILTER"],
    fields: {},
    diagnosis: "Filtro obstruido. Se reemplazó en campo.",
    activitiesPerformed: "Cambio de filtro y limpieza",
    parts: [],
    tests: "Flujo recuperado",
    recommendation: "Revisar en treinta días",
    evidence: [],
    result: "conforming" as const,
    followup: "",
  };
  return {
    id: demoIds.job(9901),
    accountId: demoIds.account(1),
    orderId: order.id,
    actorId: demoUserId("technician"),
    deviceId: demoIds.job(9902),
    createdAt: "2026-10-20T16:00:00.000Z",
    local: {
      id: demoIds.job(9903),
      orderId: order.id,
      leaseId: demoIds.job(9904),
      deviceId: demoIds.job(9902),
      expectedVersion: 1,
      action: "save",
      execution,
    },
    server: {
      order: { ...order, rowVersion: 2 },
      execution: {
        ...execution,
        diagnosis: "Revisar suministro de agua antes de sustituir el filtro.",
      },
      actorId: demoUserId("owner"),
      capturedAt: "2026-10-20T16:00:00.000Z",
    },
    fields: ["diagnosis"],
    state: "conflict",
    resolution: null,
  };
}
