import { createFileRoute } from "@tanstack/react-router";
import { Alerts } from "@/components/ice24/screens";
export const Route = createFileRoute("/alertas")({
  head: () => ({ meta: [{title:"Centro de alertas · ICE24 OS"},{name:"description",content:"Centro de alertas de ICE24 OS. Prototipo de operación de máquinas expendedoras de hielo en México."},{property:"og:title",content:"Centro de alertas · ICE24 OS"},{property:"og:description",content:"Consulta centro de alertas en tu centro de operación ICE24 OS."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
  component: Screen,
});
function Screen() {return <Alerts/>; }
