import { DEMO_ACCOUNTS, demoIds } from "./fixtures";
import type { DemoState } from "./state";

/** P0 fixtures only: no order execution, persisted download or synchronization. */
export const REVIEW_SCREENS = {
  "UI-MNT-01": "Calendario de mantenimiento",
  "UI-MNT-02": "Actividades programadas",
  "UI-TKT-01": "Crear ticket",
  "UI-TKT-02": "Detalle de ticket",
  "UI-WO-01": "Órdenes de trabajo",
  "UI-WO-02": "Ejecutar orden",
  "UI-WO-03": "Revisar cierre",
  "UI-WO-04": "Corrección y anulación",
  "UI-SYNC-01": "Conflictos de sincronización",
} as const;

export function maintenanceFixtures(state: DemoState) {
  return DEMO_ACCOUNTS[state.account].machines.flatMap((machine, index) =>
    [
      "Programada",
      "Próxima",
      "Vencida",
      "En atención",
      "Completada",
      "Con observaciones",
      "No conforme",
      "Corregida",
      "Anulada",
    ].map((status, order) => ({
      id: demoIds.job(100 + index * 10 + order),
      machineId: machine.id,
      branchId: machine.branchId,
      code: machine.code,
      activity: order % 2 === 0 ? "Revisar filtro de agua" : "Limpiar condensador",
      status,
      assignee: "Ana Torres",
      ticket: `TKT-DEMO-${index + 1}`,
      order: `OT-DEMO-${index + 1}-${order + 1}`,
    })),
  );
}
