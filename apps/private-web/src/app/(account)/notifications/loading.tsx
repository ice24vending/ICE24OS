import { ServiceState } from "../../../features/account-shell/service-state";

export default function LoadingNotifications() {
  return (
    <main id="main-content">
      <ServiceState kind="loading" title="Cargando las alertas…" />
    </main>
  );
}
