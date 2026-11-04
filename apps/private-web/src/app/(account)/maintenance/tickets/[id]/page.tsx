import { TicketsPage } from "../../../../../features/maintenance/tickets-page";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <TicketsPage mode="detail" id={(await params).id} query={await searchParams} />;
}
