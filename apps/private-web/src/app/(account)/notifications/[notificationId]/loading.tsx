import { DetailLayout, PageWidth } from "@ice24/ui";
import { ServiceState } from "../../../../components/system-state/service-state";

export default function LoadingNotification() {
  return (
    // Own breadcrumbs: the shell would otherwise derive one from the raw id.
    <PageWidth
      as="main"
      variant="reading"
      id="main-content"
      data-page-ready="false"
      data-page-breadcrumbs="true"
    >
      <DetailLayout
        title="Aviso"
        breadcrumbs={[{ label: "Avisos", href: "/notifications" }, { label: "Aviso" }]}
        status={<ServiceState kind="loading" title="Cargando el aviso…" />}
      />
    </PageWidth>
  );
}
