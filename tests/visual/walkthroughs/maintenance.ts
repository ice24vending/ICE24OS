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
    interaction?: "ticket-photo";
  }[];
}

export const walkthroughs: readonly Walkthrough[] = [
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
        label: "4. Comparar versiones; aún sin sincronización real",
        path: "/maintenance/review/UI-SYNC-01",
        heading: "Conflictos de sincronización",
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
        label: "4. Conflicto; resolución todavía sin lógica",
        path: "/maintenance/review/UI-SYNC-01",
        heading: "Conflictos de sincronización",
        demo: { maintenance: "conflict" },
      },
    ],
  },
];
