import { ServiceState } from "../../../components/system-state/service-state";
import { ListLayout, PageWidth } from "@ice24/ui";

export default function LoadingAudit() {
  return (
    <PageWidth as="main" id="main-content" aria-label="Auditoría" data-page-ready="false">
      <ListLayout
        title="Auditoría"
        status={<ServiceState kind="loading" skeleton="list" title="Cargando la auditoría…" />}
      />
    </PageWidth>
  );
}
