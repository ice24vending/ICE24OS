import { SystemState } from "@ice24/ui";
export default function Loading() {
  return (
    <main id="main-content" data-page-ready="false" aria-busy="true">
      <h1 className="ids-visually-hidden">Mantenimiento</h1>
      <SystemState kind="loading" />
    </main>
  );
}
