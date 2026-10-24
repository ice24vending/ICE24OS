import { DashboardScreen } from "../../../../features/templates/dashboard-screen";
import { loadTemplateData } from "../../../../server/demo/templates";

export const dynamic = "force-dynamic";

/** «Plantillas» (F6-09/F6-10, demo only): Panel. */
export default async function TemplatePanelPage() {
  return <DashboardScreen data={await loadTemplateData()} />;
}
