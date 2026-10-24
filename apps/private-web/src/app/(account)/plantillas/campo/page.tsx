import { FieldScreen } from "../../../../features/templates/field-screen";
import { loadTemplateData } from "../../../../server/demo/templates";

export const dynamic = "force-dynamic";

/** «Plantillas» (F6-09/F6-10, demo only): Campo. */
export default async function TemplateCampoPage() {
  return <FieldScreen data={await loadTemplateData()} />;
}
