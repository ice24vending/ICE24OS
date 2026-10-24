import { ServiceState } from "../../../components/system-state/service-state";

export default function LoadingFiles() {
  return (
    <main id="main-content">
      <ServiceState kind="loading" skeleton="list" title="Cargando los archivos privados…" />
    </main>
  );
}
