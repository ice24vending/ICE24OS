import { BranchesPage } from "../../../../features/branches/page";
export const metadata = { title: "Nueva sucursal" };
export const dynamic = "force-dynamic";
export default function Page() {
  return <BranchesPage create />;
}
