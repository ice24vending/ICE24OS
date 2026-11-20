import { EquipmentSectionPage } from "../../../features/equipment/section-page";

export const metadata = { title: "Sucursales" };

export const dynamic = "force-dynamic";
export default function Page() {
  return <EquipmentSectionPage section="branches" />;
}
