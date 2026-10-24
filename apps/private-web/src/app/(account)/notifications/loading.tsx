import { ServiceState } from "../../../components/system-state/service-state";

export default function LoadingNotifications() {
  return (
    <main id="main-content">
      <ServiceState kind="loading" skeleton="list" title="Cargando las alertas…" />
    </main>
  );
}
