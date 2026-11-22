import { BranchesPage } from "../../../../features/branches/page";
export const metadata = { title: "Detalle de sucursal" };
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <BranchesPage id={(await params).id} />;
}
