import { TicketsPage } from "../../../../../features/maintenance/tickets-page";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <TicketsPage mode="detail" id={(await params).id} />;
}
