import { DetailScreen } from "../../../../features/templates/detail-screen";
import { loadTemplateData } from "../../../../server/demo/templates";
import { FROM_PARAM, backHref } from "../../../../features/navigation/deep-links";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detalle" };

type DetailPageProps = {
  readonly searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
};

/** «Plantillas» (F6-09/F6-10, demo only): Detalle of `?machine=` or the first machine. */
export default async function TemplateDetailPage({ searchParams }: DetailPageProps) {
  const { machine, ejemplo, [FROM_PARAM]: from } = await searchParams;
  const baseExample = ejemplo === "base";
  return (
    <DetailScreen
      data={await loadTemplateData(baseExample ? { example: "base" } : undefined)}
      machineId={typeof machine === "string" ? machine : undefined}
      backHref={backHref(
        from,
        baseExample ? "/plantillas/lista?ejemplo=base" : "/plantillas/lista",
      )}
      baseExample={baseExample}
      showDocumentation={baseExample}
    />
  );
}
