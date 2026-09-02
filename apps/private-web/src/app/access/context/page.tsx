import type { AccessContext } from "@ice24/contracts";
import { redirect } from "next/navigation";

import { readBrowserSession } from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";

export const dynamic = "force-dynamic";

type ContextPageProps = {
  readonly searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
};

export default async function ContextPage({ searchParams }: ContextPageProps) {
  const session = await readBrowserSession();
  if (session === undefined) redirect("/?error=expired");
  const query = await searchParams;
  let contexts: AccessContext[] = [];
  let loadFailed = false;
  try {
    const response = await callPrivateApi("me/contexts", session);
    if (!response.ok) throw new Error("Context list failed");
    contexts = (await response.json()) as AccessContext[];
  } catch {
    loadFailed = true;
  }

  return (
    <main id="main-content" className="centered-page">
      <section className="access-card access-card--wide" aria-labelledby="context-title">
        <p className="step-label">Contexto de trabajo</p>
        <h1 id="context-title">¿Dónde vas a trabajar?</h1>
        <p className="helper">
          Cambiar de contexto no cierra tu identidad. Los permisos se vuelven a calcular para cada
          cuenta.
        </p>
        {(loadFailed || query.error === "context") && (
          <div className="notice notice--error" role="alert">
            No pudimos cargar o activar tus contextos. Intenta nuevamente; ningún permiso fue
            ampliado.
          </div>
        )}
        {!loadFailed && contexts.length === 0 && (
          <div className="empty-state" role="status">
            <strong>No hay asociaciones activas.</strong>
            <p>Solicita al propietario o a ICE24 que revise tu invitación.</p>
          </div>
        )}
        <div className="context-list">
          {contexts.map((context) => (
            <form key={context.membershipId} method="post" action="/api/session-context">
              <input type="hidden" name="csrfToken" value={session.csrfToken} />
              <input type="hidden" name="accountId" value={context.accountId} />
              <button className="context-option" type="submit">
                <span>
                  <strong>{context.accountName}</strong>
                  <small>{context.roleCodes.join(" · ")}</small>
                </span>
                <span className={`mode-badge mode-badge--${context.accessMode.toLowerCase()}`}>
                  {context.accessMode === "READ_ONLY" ? "Sólo lectura" : context.accessMode}
                </span>
              </button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
