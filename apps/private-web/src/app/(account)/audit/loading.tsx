import { ServiceState } from "../../../components/system-state/service-state";
import { ListLayout } from "@ice24/ui";
import { AuditPageContent } from "../../../features/audit/page-frame";

export default function LoadingAudit() {
  return (
    <AuditPageContent title="Auditoría" ready={false}>
      <ListLayout
        title="Auditoría"
        status={<ServiceState kind="loading" skeleton="list" title="Cargando la auditoría…" />}
      />
    </AuditPageContent>
  );
}
