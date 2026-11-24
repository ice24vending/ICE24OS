import { MachineDetailPage } from "../../../../features/machines/detail-page";
export const metadata = { title: "Ficha de máquina" };
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <MachineDetailPage id={(await params).id} />;
}
