import { PageWidth } from "@ice24/ui";
import { ServiceState } from "../../../components/system-state/service-state";

export default function LoadingSummary() {
  return (
    <PageWidth as="main" id="main-content" data-page-ready="false">
      <h1>Resumen</h1>
      <ServiceState kind="loading" skeleton="cards" title="Cargando el resumen…" />
    </PageWidth>
  );
}
