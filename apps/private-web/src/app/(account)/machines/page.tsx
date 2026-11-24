import { EquipmentSectionPage } from "../../../features/equipment/section-page";
import { redirect } from "next/navigation";
import { machineDetailSchema } from "@ice24/contracts";

export const metadata = { title: "Máquinas" };

export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = machineDetailSchema.shape.id.safeParse((await searchParams).machineId);
  if (id.success) redirect(`/machines/${id.data.toLowerCase()}`);
  return <EquipmentSectionPage section="machines" />;
}
