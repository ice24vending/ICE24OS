import { WizardScreen } from "../../../../features/templates/wizard-screen";
import { loadTemplateData } from "../../../../server/demo/templates";

export const dynamic = "force-dynamic";

/** «Plantillas» (F6-09/F6-10, demo only): Asistente. */
export default async function TemplateAsistentePage() {
  return <WizardScreen data={await loadTemplateData()} />;
}
