import { ServiceState } from "../../../features/account-shell/service-state";

export default function LoadingFiles() {
  return (
    <main id="main-content">
      <ServiceState kind="loading" title="Cargando los archivos privados…" />
    </main>
  );
}
