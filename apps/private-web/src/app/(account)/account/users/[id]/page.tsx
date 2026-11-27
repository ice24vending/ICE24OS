import { UsersPage } from "../../../../../features/users/page";
export const metadata = { title: "Usuario" };
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <UsersPage id={(await params).id} />;
}
