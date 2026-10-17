import { createFileRoute } from "@tanstack/react-router";
import { BranchList } from "@/components/ice24/screens";
export const Route = createFileRoute("/sucursales")({
  head: () => ({ meta: [{title:"Sucursales · ICE24 OS"},{name:"description",content:"Sucursales de ICE24 OS. Prototipo de operación de máquinas expendedoras de hielo en México."},{property:"og:title",content:"Sucursales · ICE24 OS"},{property:"og:description",content:"Consulta sucursales en tu centro de operación ICE24 OS."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
  component: Screen,
});
function Screen() {return <BranchList/>; }
