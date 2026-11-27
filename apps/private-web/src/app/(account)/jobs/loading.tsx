import { ServiceState } from "../../../components/system-state/service-state";
import { ListLayout, PageWidth } from "@ice24/ui";

export default function LoadingJobs() {
  return (
    <PageWidth as="main" id="main-content" aria-label="Centro de trabajos" data-page-ready="false">
      <ListLayout
        title="Centro de trabajos"
        status={
          <ServiceState kind="loading" skeleton="list" title="Cargando el centro de trabajos…" />
        }
      />
    </PageWidth>
  );
}
