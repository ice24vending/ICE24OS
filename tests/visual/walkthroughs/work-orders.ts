import type { Walkthrough } from "./maintenance";
export const walkthroughs: readonly Walkthrough[] = [
  {
    id: "ticket-to-work-order",
    title: "Del ticket a la orden asignada — servicios simulados",
    demo: { persona: "owner" },
    steps: [
      {
        label: "1. Revisar la falla y abrir Asignar técnico",
        path: "/maintenance/tickets/70000000-0000-4000-8000-000000000384",
        heading: "Detalle del ticket",
      },
      {
        label: "2. Elegir técnico y actividad; confirmar asignación (API simulada)",
        path: "/maintenance/work-orders/new?sourceType=ticket&sourceId=70000000-0000-4000-8000-000000000384",
        heading: "Asignar técnico",
        interaction: "work-order-assign",
      },
      {
        label: "3. Consultar checklist, procedimiento y piezas congeladas como técnico",
        path: "/maintenance/work-orders/10000000-0000-4000-8000-0000000007d0",
        heading: "Detalle de la orden",
        demo: { persona: "technician" },
      },
    ],
  },
];
