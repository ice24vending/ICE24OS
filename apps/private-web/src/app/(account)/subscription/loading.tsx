import { ServiceState } from "../../../components/system-state/service-state";

export default function LoadingSubscription() {
  return (
    <main id="main-content">
      <ServiceState kind="loading" skeleton="detail" title="Cargando la suscripción…" />
    </main>
  );
}
