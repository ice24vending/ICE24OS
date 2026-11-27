import { notFound } from "next/navigation";
import { AdministrationPage } from "../../../../../features/ice24/page";
import { isAdminSection } from "../../../../../features/ice24/model";
export const metadata = { title: "Detalle de administración" };
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section, id } = await params;
  const query = await searchParams;
  if (!isAdminSection(section) || section === "panel" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/iu.test(id))
    notFound();
  return (
    <AdministrationPage
      section={section}
      id={id}
      returnTo={typeof query.desde === "string" ? query.desde : undefined}
    />
  );
}
