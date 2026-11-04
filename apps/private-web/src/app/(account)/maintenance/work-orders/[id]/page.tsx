import { WorkOrdersPage } from "../../../../../features/work-orders/work-orders-page";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <WorkOrdersPage mode="detail" id={(await params).id} />;
}
