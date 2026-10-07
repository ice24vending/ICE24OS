import { ServiceState } from "../../../features/account-shell/service-state";

export default function LoadingJobs() {
  return (
    <main id="main-content">
      <ServiceState kind="loading" title="Cargando el centro de trabajos…" />
    </main>
  );
}
