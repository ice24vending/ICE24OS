import { ListScreen } from "../../../../features/templates/list-screen";
import { loadTemplateData } from "../../../../server/demo/templates";

export const dynamic = "force-dynamic";
// Static metadata reaches the document before Next announces a route transition.
export const metadata = { title: "Máquinas" };

type TemplateListPageProps = {
  readonly searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
};

/** «Plantillas» (F6-09/F6-10, demo only): Lista. */
export default async function TemplateListaPage({ searchParams }: TemplateListPageProps) {
  const { ejemplo } = await searchParams;
  return (
    <ListScreen
      data={await loadTemplateData(ejemplo === "base" ? { example: "base" } : undefined)}
    />
  );
}
