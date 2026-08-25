import { StatusPanel } from "@ice24/ui";

export default function Home() {
  return (
    <main className="public-shell">
      <p className="public-eyebrow">ICE24 OS</p>
      <h1>Portal público en preparación</h1>
      <p>
        Esta superficie está aislada de la aplicación privada. No hay documentos ni datos publicados
        durante la fase fundacional.
      </p>
      <StatusPanel title="Sin contenido publicado" tone="neutral">
        <p>La publicación requerirá una acción explícita, autorizada y auditada.</p>
      </StatusPanel>
    </main>
  );
}
