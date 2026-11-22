import { BranchesPage } from "../../../features/branches/page";

export const metadata = { title: "Sucursales" };

export const dynamic = "force-dynamic";
export default function Page() {
  return <BranchesPage />;
}
