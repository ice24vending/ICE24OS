import { createFileRoute } from "@tanstack/react-router";
import { Audit } from "@/components/ice24/screens";
export const Route = createFileRoute("/auditoria")({
  head: () => ({ meta: [{title:"Auditoría · ICE24 OS"},{name:"description",content:"Auditoría de ICE24 OS. Prototipo de operación de máquinas expendedoras de hielo en México."},{property:"og:title",content:"Auditoría · ICE24 OS"},{property:"og:description",content:"Consulta auditoría en tu centro de operación ICE24 OS."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
  component: Screen,
});
function Screen() {return <Audit/>; }
