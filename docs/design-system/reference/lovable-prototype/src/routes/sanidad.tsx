import { createFileRoute } from "@tanstack/react-router";
import { Sanitary } from "@/components/ice24/screens";
export const Route = createFileRoute("/sanidad")({
  head: () => ({ meta: [{title:"Control sanitario · ICE24 OS"},{name:"description",content:"Control sanitario de ICE24 OS. Prototipo de operación de máquinas expendedoras de hielo en México."},{property:"og:title",content:"Control sanitario · ICE24 OS"},{property:"og:description",content:"Consulta control sanitario en tu centro de operación ICE24 OS."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
  component: Screen,
});
function Screen() {return <Sanitary/>; }
