import { DetailScreen } from "../../../../features/templates/detail-screen";
import { loadTemplateData } from "../../../../server/demo/templates";

export const dynamic = "force-dynamic";

type DetailPageProps = {
  readonly searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
};

/** «Plantillas» (F6-09/F6-10, demo only): Detalle of `?machine=` or the first machine. */
export default async function TemplateDetailPage({ searchParams }: DetailPageProps) {
  const { machine } = await searchParams;
  return (
    <DetailScreen
      data={await loadTemplateData()}
      machineId={typeof machine === "string" ? machine : undefined}
    />
  );
}
