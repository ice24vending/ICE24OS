import { WorkOrdersPage } from "../../../../features/work-orders/work-orders-page";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <WorkOrdersPage mode="list" query={await searchParams} />;
}
