import { ServiceState } from "../../../components/system-state/service-state";

export default function LoadingJobs() {
  return (
    <main id="main-content">
      <ServiceState kind="loading" skeleton="list" title="Cargando el centro de trabajos…" />
    </main>
  );
}
