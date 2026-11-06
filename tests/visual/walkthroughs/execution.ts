import type { Walkthrough } from "./maintenance";
export const walkthroughs: readonly Walkthrough[] = [
  {
    id: "execution-reopen",
    title: "Reabrir una orden con motivo — servicios simulados",
    demo: { persona: "owner" },
    steps: [
      {
        label: "Reabrir conservando las versiones anteriores",
        path: "/maintenance/work-orders/10000000-0000-4000-8000-0000000007d4/review",
        heading: "Revisión de la ejecución",
        interaction: "execution-reopen",
      },
    ],
  },
  {
    id: "execution-evidence-close",
    title: "Ejecutar y cerrar con fotos y firma — servicios simulados",
    demo: { persona: "technician" },
    steps: [
      {
        label: "1. Completar checklist, lectura, lote, firma y fotos verificadas",
        path: "/maintenance/work-orders/10000000-0000-4000-8000-0000000007d3/execute",
        heading: "Ejecutar orden",
        interaction: "execution-capture",
      },
      {
        label: "2. Revisar la ejecución y confirmar cierre (API simulada)",
        path: "/maintenance/work-orders/10000000-0000-4000-8000-0000000007d3/close",
        heading: "Revisar y cerrar",
        demo: { persona: "technician", maintenance: "downloaded" },
        interaction: "execution-close",
      },
    ],
  },
  {
    id: "execution-correction",
    title: "Corregir una lectura y conservar el original — servicios simulados",
    demo: { persona: "owner" },
    steps: [
      {
        label: "1. Comparar, indicar motivo y registrar nueva versión",
        path: "/maintenance/work-orders/10000000-0000-4000-8000-0000000007d4/review",
        heading: "Revisión de la ejecución",
        interaction: "execution-correct",
      },
    ],
  },
];
