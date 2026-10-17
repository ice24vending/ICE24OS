import { createFileRoute } from "@tanstack/react-router";
import { BranchDetail } from "@/components/ice24/screens";
export const Route = createFileRoute("/sucursales_/$id")({
  head: () => ({ meta: [{title:"Detalle de sucursal · ICE24 OS"},{name:"description",content:"Detalle de sucursal de ICE24 OS. Prototipo de operación de máquinas expendedoras de hielo en México."},{property:"og:title",content:"Detalle de sucursal · ICE24 OS"},{property:"og:description",content:"Consulta detalle de sucursal en tu centro de operación ICE24 OS."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
  component: Screen,
});
function Screen() { const {id}=Route.useParams(); return <BranchDetail id={id}/>; }
