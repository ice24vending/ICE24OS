import { ServiceState } from "../../../components/system-state/service-state";

export default function LoadingSubscription() {
  return (
    <main id="main-content" data-page-ready="false" aria-busy="true">
      <h1>Suscripción</h1>
      <ServiceState kind="loading" skeleton="detail" title="Cargando la suscripción…" />
    </main>
  );
}
