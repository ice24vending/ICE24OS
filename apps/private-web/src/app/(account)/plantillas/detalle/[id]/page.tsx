import { DetailScreen } from "../../../../../features/templates/detail-screen";
import { loadTemplateData } from "../../../../../server/demo/templates";
import { FROM_PARAM, backHref } from "../../../../../features/navigation/deep-links";

export const metadata = { title: "Detalle" };
export const dynamic = "force-dynamic";

/** Demo-only route pattern: record identity in the path; list state stays in desde. */
export default async function TemplateRecordPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}) {
  const [{ id }, query, data] = await Promise.all([
    params,
    searchParams,
    loadTemplateData({ example: "base" }),
  ]);
  return (
    <DetailScreen
      data={data}
      machineId={id}
      backHref={backHref(query[FROM_PARAM], "/plantillas/lista?ejemplo=base")}
      baseExample
    />
  );
}
