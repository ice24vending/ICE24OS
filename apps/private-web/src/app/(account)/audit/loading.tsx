import { ServiceState } from "../../../components/system-state/service-state";

export default function LoadingAudit() {
  return (
    <main id="main-content">
      <ServiceState kind="loading" skeleton="list" title="Cargando la auditoría…" />
    </main>
  );
}
