import { DetailLayout, PageWidth } from "@ice24/ui";
import { ServiceState } from "../../../../../components/system-state/service-state";
export default function Loading() {
  return (
    <PageWidth
      as="main"
      variant="reading"
      id="main-content"
      aria-label="Detalle de administración"
      data-page-ready="false"
      data-page-breadcrumbs="true"
    >
      <DetailLayout
        title="Detalle de administración"
        breadcrumbs={[
          { label: "Administración ICE24", href: "/ice24" },
          { label: "Detalle de administración" },
        ]}
        status={<ServiceState kind="loading" title="Cargando registro…" />}
      />
    </PageWidth>
  );
}
