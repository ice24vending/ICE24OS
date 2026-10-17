import { createFileRoute } from "@tanstack/react-router";
import { Tasks } from "@/components/ice24/screens";
export const Route = createFileRoute("/mantenimiento")({
  head: () => ({ meta: [{title:"Mantenimiento · ICE24 OS"},{name:"description",content:"Mantenimiento de ICE24 OS. Prototipo de operación de máquinas expendedoras de hielo en México."},{property:"og:title",content:"Mantenimiento · ICE24 OS"},{property:"og:description",content:"Consulta mantenimiento en tu centro de operación ICE24 OS."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
  component: Screen,
});
function Screen() {return <Tasks maintenance/>; }
