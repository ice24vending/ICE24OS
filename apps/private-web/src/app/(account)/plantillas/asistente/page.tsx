import { WizardScreen } from "../../../../features/templates/wizard-screen";
import { loadTemplateData } from "../../../../server/demo/templates";
import { FROM_PARAM, backHref } from "../../../../features/navigation/deep-links";

export const dynamic = "force-dynamic";

type WizardPageProps = {
  readonly searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
};

/** «Plantillas» (F6-09/F6-10, demo only): Asistente. */
export default async function TemplateAsistentePage({ searchParams }: WizardPageProps) {
  const { [FROM_PARAM]: from } = await searchParams;
  return <WizardScreen data={await loadTemplateData()} backHref={backHref(from, "/plantillas")} />;
}
