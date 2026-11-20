import { EquipmentSectionPage } from "../../../features/equipment/section-page";

export const metadata = { title: "Administración ICE24" };

export const dynamic = "force-dynamic";
export default function Page() {
  return <EquipmentSectionPage section="ice24" />;
}
