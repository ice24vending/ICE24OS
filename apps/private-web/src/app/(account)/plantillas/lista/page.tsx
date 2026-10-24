import { ListScreen } from "../../../../features/templates/list-screen";
import { loadTemplateData } from "../../../../server/demo/templates";

export const dynamic = "force-dynamic";

/** «Plantillas» (F6-09/F6-10, demo only): Lista. */
export default async function TemplateListaPage() {
  return <ListScreen data={await loadTemplateData()} />;
}
