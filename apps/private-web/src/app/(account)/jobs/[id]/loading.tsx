import { DetailLayout, PageWidth } from "@ice24/ui";
import { ServiceState } from "../../../../components/system-state/service-state";
export default function Loading() {
  return (
    <PageWidth
      as="main"
      variant="reading"
      id="main-content"
      aria-label="Detalle del trabajo"
      data-page-ready="false"
      data-page-breadcrumbs="true"
    >
      <DetailLayout
        title="Detalle del trabajo"
        breadcrumbs={[
          { label: "Centro de trabajos", href: "/jobs" },
          { label: "Detalle del trabajo" },
        ]}
        status={<ServiceState kind="loading" title="Cargando trabajo…" />}
      />
    </PageWidth>
  );
}
