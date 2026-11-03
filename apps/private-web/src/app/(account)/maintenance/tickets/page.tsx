import { TicketsPage } from "../../../../features/maintenance/tickets-page";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <TicketsPage mode="list" query={await searchParams} />;
}
