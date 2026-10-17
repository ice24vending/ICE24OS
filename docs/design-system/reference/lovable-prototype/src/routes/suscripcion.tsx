import { createFileRoute } from "@tanstack/react-router";
import { Subscription } from "@/components/ice24/screens";
export const Route = createFileRoute("/suscripcion")({
  head: () => ({ meta: [{title:"Suscripción · ICE24 OS"},{name:"description",content:"Suscripción de ICE24 OS. Prototipo de operación de máquinas expendedoras de hielo en México."},{property:"og:title",content:"Suscripción · ICE24 OS"},{property:"og:description",content:"Consulta suscripción en tu centro de operación ICE24 OS."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
  component: Screen,
});
function Screen() {return <Subscription/>; }
