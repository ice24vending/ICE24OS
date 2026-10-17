import { createFileRoute } from "@tanstack/react-router";
import { Login } from "@/components/ice24/login";
export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{title:"Iniciar sesión · ICE24 OS"},{name:"description",content:"Iniciar sesión de ICE24 OS. Prototipo de operación de máquinas expendedoras de hielo en México."},{property:"og:title",content:"Iniciar sesión · ICE24 OS"},{property:"og:description",content:"Consulta iniciar sesión en tu centro de operación ICE24 OS."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
  component: Screen,
});
function Screen() {return <Login/>; }
