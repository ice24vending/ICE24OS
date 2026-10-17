import { createFileRoute } from "@tanstack/react-router";
import { Documents } from "@/components/ice24/screens";
export const Route = createFileRoute("/documentos")({
  head: () => ({ meta: [{title:"Documentos · ICE24 OS"},{name:"description",content:"Documentos de ICE24 OS. Prototipo de operación de máquinas expendedoras de hielo en México."},{property:"og:title",content:"Documentos · ICE24 OS"},{property:"og:description",content:"Consulta documentos en tu centro de operación ICE24 OS."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
  component: Screen,
});
function Screen() {return <Documents/>; }
