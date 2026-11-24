import { PageWidth } from "@ice24/ui";
import { ServiceState } from "../../../components/system-state/service-state";

export default function LoadingProfile() {
  return (
    <PageWidth as="main" id="main-content" aria-label="Perfil" data-page-ready="false">
      <h1>Perfil</h1>
      <ServiceState kind="loading" skeleton="cards" title="Cargando tu perfil…" />
    </PageWidth>
  );
}
