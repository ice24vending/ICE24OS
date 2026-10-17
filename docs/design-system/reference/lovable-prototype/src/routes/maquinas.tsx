import { createFileRoute } from "@tanstack/react-router";
import { MachineList } from "@/components/ice24/screens";
export const Route = createFileRoute("/maquinas")({
  validateSearch: (search: Record<string, unknown>): { q?: string | undefined } => ({ q: typeof search["q"] === "string" ? (search["q"] as string) : undefined }),
  head: () => ({ meta: [{title:"Máquinas · ICE24 OS"},{name:"description",content:"Máquinas de ICE24 OS. Prototipo de operación de máquinas expendedoras de hielo en México."},{property:"og:title",content:"Máquinas · ICE24 OS"},{property:"og:description",content:"Consulta máquinas en tu centro de operación ICE24 OS."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
  component: Screen,
});
function Screen() { const {q}=Route.useSearch();return <MachineList query={q ?? ''}/>; }
