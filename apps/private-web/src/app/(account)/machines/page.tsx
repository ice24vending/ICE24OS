import { EquipmentSectionPage } from "../../../features/equipment/section-page";

export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <EquipmentSectionPage section="machines" machineId={(await searchParams).machineId} />;
}
