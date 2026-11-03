import type { Walkthrough } from "./maintenance";
export const walkthroughs: readonly Walkthrough[] = [
  {
    id: "ticket-with-photo",
    title: "Reportar una falla con foto desde el celular — datos y almacenamiento simulados",
    demo: { persona: "technician" },
    steps: [
      {
        label: "1. Reportar falla y subir foto privada (simulación de servicios)",
        path: "/maintenance/tickets/new",
        heading: "Reportar una falla",
        interaction: "ticket-photo",
      },
      {
        label: "2. Consultar diagnóstico y seguimiento del ticket ficticio",
        path: "/maintenance/tickets/70000000-0000-4000-8000-000000000384",
        heading: "Detalle del ticket",
      },
    ],
  },
];
