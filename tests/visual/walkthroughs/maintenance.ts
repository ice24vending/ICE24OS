import type { DemoState } from "../../../apps/private-web/src/server/demo/state";

export interface Walkthrough {
  id: string;
  title: string;
  demo: Partial<DemoState>;
  steps: readonly {
    label: string;
    path: string;
    heading: string;
    demo?: Partial<DemoState>;
    interaction?:
      | "ticket-photo"
      | "work-order-assign"
      | "execution-capture"
      | "execution-close"
      | "execution-correct"
      | "execution-reopen"
      | "machine-record"
      | "offline-conflict"
      | "offline-field";
  }[];
}

export const walkthroughs: readonly Walkthrough[] = [
  {
    id: "offline-conflict",
    title: "Detectar y resolver un conflicto",
    demo: { persona: "technician" },
    steps: [
      {
        label: "Técnico compara; administrador confirma con motivo y conserva originales",
        path: "/maintenance/work-orders/10000000-0000-4000-8000-0000000007d3/execute",
        heading: "Ejecutar orden",
        interaction: "offline-conflict",
      },
    ],
  },
  {
    id: "maintenance-machine-record",
    title: "De mantenimiento al expediente de la máquina",
    demo: { persona: "technician" },
    steps: [
      {
        label:
          "Abrir el enlace de máquina con teclado: expediente seleccionado, enfocado y visible en Máquinas",
        path: "/maintenance?view=list",
        heading: "Actividades programadas",
        interaction: "machine-record",
      },
    ],
  },
  {
    id: "offline-field",
    title: "Orden completa en campo sin internet",
    demo: { persona: "technician" },
    steps: [
      {
        label:
          "Descargar → modo avión → capturar evidencia → recargar → reconectar → cierre sincronizado",
        path: "/maintenance/work-orders/10000000-0000-4000-8000-0000000007d3/execute",
        heading: "Ejecutar orden",
        interaction: "offline-field",
      },
    ],
  },
  {
    id: "overdue-from-summary",
    title: "Ver mantenimientos vencidos desde el Resumen",
    demo: { persona: "owner" },
    steps: [
      {
        label: "1. Resumen: Mantenimientos próximos, próximos 7 días",
        path: "/summary",
        heading: "Resumen",
      },
      {
        label: "2. Consultar el listado de próximos",
        path: "/maintenance?view=list&period=next7days",
        heading: "Actividades programadas",
      },
      {
        label: "3. Quitar el periodo y consultar vencidos",
        path: "/maintenance?view=list&state=overdue",
        heading: "Actividades programadas",
      },
    ],
  },
  {
    id: "maintenance-review",
    title: "Revisar ticket, orden y conflicto — simulación P0",
    demo: { persona: "technician", maintenance: "downloaded" },
    steps: [
      {
        label: "0. Crear ticket — formulario en modo demo sin persistencia",
        path: "/maintenance/review/UI-TKT-01",
        heading: "Reportar una falla",
      },
      {
        label: "1. Revisar el ticket ficticio",
        path: "/maintenance/review/UI-TKT-02",
        heading: "Detalle del ticket",
      },
      {
        label: "2. Consultar la orden (maqueta)",
        path: "/maintenance/review/UI-WO-02",
        heading: "Ejecutar orden",
      },
      {
        label: "3. Revisar requisitos antes de cerrar",
        path: "/maintenance/review/UI-WO-03",
        heading: "Revisar cierre",
      },
      {
        label: "4. Centro de sincronización: comparar un conflicto de ejemplo",
        path: "/maintenance/review/UI-SYNC-01",
        heading: "Centro de sincronización",
        demo: { maintenance: "review-conflict" },
      },
    ],
  },
  {
    id: "offline-review",
    title: "Descarga, fotos pendientes y conflicto — simulación P0",
    demo: { persona: "technician", maintenance: "downloaded" },
    steps: [
      {
        label: "1. Orden descargada (simulada)",
        path: "/maintenance/review/UI-WO-02",
        heading: "Ejecutar orden",
      },
      {
        label: "2. Sin conexión (simulada)",
        path: "/maintenance/review/UI-WO-02",
        heading: "Ejecutar orden",
        demo: { network: "offline" },
      },
      {
        label: "3. Fotos pendientes al reconectar (simuladas)",
        path: "/maintenance/review/UI-WO-02",
        heading: "Ejecutar orden",
        demo: { maintenance: "pending" },
      },
      {
        label: "4. Centro funcional: conflicto de ejemplo en modo consulta",
        path: "/maintenance/review/UI-SYNC-01",
        heading: "Centro de sincronización",
        demo: { maintenance: "review-conflict" },
      },
    ],
  },
];
