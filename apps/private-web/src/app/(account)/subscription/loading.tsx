import { ServiceState } from "../../../features/account-shell/service-state";

export default function LoadingSubscription() {
  return (
    <main id="main-content">
      <ServiceState kind="loading" title="Cargando la suscripción…" />
    </main>
  );
}
