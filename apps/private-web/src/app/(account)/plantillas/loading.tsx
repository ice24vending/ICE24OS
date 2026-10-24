import { ServiceState } from "../../../components/system-state/service-state";

export default function LoadingTemplates() {
  return (
    <main id="main-content" className="private-shell template-screen">
      <ServiceState kind="loading" skeleton="cards" title="Cargando la plantilla…" />
    </main>
  );
}
