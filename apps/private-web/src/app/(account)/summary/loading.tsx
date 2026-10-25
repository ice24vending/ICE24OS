import { ServiceState } from "../../../components/system-state/service-state";

export default function LoadingSummary() {
  return (
    <main id="main-content">
      <ServiceState kind="loading" skeleton="cards" title="Cargando el resumen…" />
    </main>
  );
}
