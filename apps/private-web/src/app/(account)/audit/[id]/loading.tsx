import { DetailLayout } from "@ice24/ui";
import { ServiceState } from "../../../../components/system-state/service-state";
import { AuditPageContent } from "../../../../features/audit/page-frame";

export default function Loading() {
  return (
    <AuditPageContent title="Detalle de auditoría" ready={false} breadcrumbs>
      <DetailLayout
        title="Detalle de auditoría"
        breadcrumbs={[{ label: "Auditoría", href: "/audit" }, { label: "Detalle" }]}
        status={<ServiceState kind="loading" title="Cargando el evento…" />}
      />
    </AuditPageContent>
  );
}
