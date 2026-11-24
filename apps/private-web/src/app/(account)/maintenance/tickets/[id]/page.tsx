import { TicketsWorkspacePage } from "../../../../../features/tickets/page";

export const metadata = { title: "Detalle del ticket" };
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <TicketsWorkspacePage id={(await params).id} />;
}
