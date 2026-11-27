import { EquipmentSectionPage } from "../../../features/equipment/section-page";

export const metadata = { title: "Configuración de cuenta" };

export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pestana?: string | string[] }>;
}) {
  // «Cancelar» and «Volver a Usuarios» of UXD-09 land on the Usuarios tab.
  const tab = (await searchParams).pestana === "usuarios" ? "users" : undefined;
  return <EquipmentSectionPage section="account" initialTab={tab} />;
}
