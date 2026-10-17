import { createFileRoute } from "@tanstack/react-router";
import { DesignSystem } from "@/components/ice24/design-system";
export const Route = createFileRoute("/design-system")({
  head: () => ({ meta: [{title:"Sistema de diseño · ICE24 OS"},{name:"description",content:"Sistema de diseño de ICE24 OS. Prototipo de operación de máquinas expendedoras de hielo en México."},{property:"og:title",content:"Sistema de diseño · ICE24 OS"},{property:"og:description",content:"Consulta sistema de diseño en tu centro de operación ICE24 OS."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
  component: Screen,
});
function Screen() {return <DesignSystem/>; }
