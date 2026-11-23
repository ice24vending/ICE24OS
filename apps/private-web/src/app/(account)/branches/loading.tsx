import { PageWidth } from "@ice24/ui";
import { ServiceState } from "../../../components/system-state/service-state";
export default function Loading() {
  return (
    <PageWidth as="main" id="main-content" data-page-ready="false">
      <h1>Sucursales</h1>
      <ServiceState kind="loading" />
    </PageWidth>
  );
}
