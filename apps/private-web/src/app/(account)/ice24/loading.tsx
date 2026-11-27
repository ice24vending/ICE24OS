import { ListLayout, PageWidth } from "@ice24/ui";
import { ServiceState } from "../../../components/system-state/service-state";
export default function Loading() {
  return (
    <PageWidth
      as="main"
      id="main-content"
      aria-label="Administración ICE24"
      data-page-ready="false"
    >
      <ListLayout
        title="Administración ICE24"
        status={<ServiceState kind="loading" title="Cargando administración…" />}
      />
    </PageWidth>
  );
}
