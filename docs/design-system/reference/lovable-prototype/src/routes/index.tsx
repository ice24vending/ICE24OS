import { createFileRoute } from "@tanstack/react-router";
import { Summary } from "@/components/ice24/screens";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{title:"Resumen · ICE24 OS"},{name:"description",content:"Resumen de ICE24 OS. Prototipo de operación de máquinas expendedoras de hielo en México."},{property:"og:title",content:"Resumen · ICE24 OS"},{property:"og:description",content:"Consulta resumen en tu centro de operación ICE24 OS."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
  component: Screen,
});
function Screen() {return <Summary/>; }
