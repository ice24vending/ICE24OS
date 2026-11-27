import { AdministrationPage } from "../../../features/ice24/page";
import { isAdminSection } from "../../../features/ice24/model";

export const metadata = { title: "Administración ICE24" };

export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const section =
    typeof query.seccion === "string" &&
    isAdminSection(query.seccion) &&
    query.seccion !== "plantillas"
      ? query.seccion
      : "modelos";
  return <AdministrationPage section={section} />;
}
