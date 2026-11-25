import { ServiceState } from "../../../components/system-state/service-state";

export default function LoadingFiles() {
  return (
    <main id="main-content" data-page-ready="false" aria-busy="true">
      <h1>Archivos privados</h1>
      <ServiceState kind="loading" skeleton="list" title="Cargando los archivos privados…" />
    </main>
  );
}
