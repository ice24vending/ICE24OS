import { DetailLayout, PageWidth } from "@ice24/ui";
import { ServiceState } from "../../../../components/system-state/service-state";

export default function Loading() {
  return (
    <PageWidth
      as="main"
      id="main-content"
      aria-label="Detalle de auditoría"
      data-page-ready="false"
      data-page-breadcrumbs="true"
    >
      <DetailLayout
        title="Detalle de auditoría"
        breadcrumbs={[{ label: "Auditoría", href: "/audit" }, { label: "Detalle" }]}
        status={<ServiceState kind="loading" title="Cargando el evento…" />}
      />
    </PageWidth>
  );
}
