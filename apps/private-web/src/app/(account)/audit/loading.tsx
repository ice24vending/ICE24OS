import { ServiceState } from "../../../features/account-shell/service-state";

export default function LoadingAudit() {
  return (
    <main id="main-content">
      <ServiceState kind="loading" title="Cargando la auditoría…" />
    </main>
  );
}
