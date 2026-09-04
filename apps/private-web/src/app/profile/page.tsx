import type { SessionSummary, UserProfile } from "@ice24/contracts";
import { redirect } from "next/navigation";

import { readBrowserSession } from "../../server/session/session";
import { callPrivateApi } from "../../server/session/supabase-auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await readBrowserSession();
  if (session === undefined) redirect("/?error=expired");
  if (session.contextId === undefined) redirect("/access/context");

  let profile: UserProfile | undefined;
  let sessions: SessionSummary[] = [];
  try {
    const [profileResponse, sessionsResponse] = await Promise.all([
      callPrivateApi("me", session),
      callPrivateApi("me/sessions", session),
    ]);
    if (!profileResponse.ok || !sessionsResponse.ok) throw new Error("Profile load failed");
    profile = (await profileResponse.json()) as UserProfile;
    sessions = (await sessionsResponse.json()) as SessionSummary[];
  } catch {
    // A protected error state is rendered without leaking profile or tenant data.
  }

  return (
    <main id="main-content" className="private-shell">
      <header className="private-header">
        <div>
          <p className="eyebrow">Sesión protegida</p>
          <h1>Perfil y seguridad</h1>
        </div>
        <form method="post" action="/api/auth/logout">
          <input type="hidden" name="csrfToken" value={session.csrfToken} />
          <button className="button button--secondary" type="submit">
            Cerrar todas las sesiones
          </button>
        </form>
      </header>

      {profile === undefined ? (
        <section className="notice notice--error" role="alert">
          No fue posible cargar el perfil autorizado. Vuelve al selector o inicia sesión nuevamente.
        </section>
      ) : (
        <div className="profile-grid">
          <section className="content-card" aria-labelledby="profile-title">
            <h2 id="profile-title">Datos de perfil</h2>
            <dl className="data-list">
              <div>
                <dt>Nombre</dt>
                <dd>{profile.displayName}</dd>
              </div>
              <div>
                <dt>Usuario</dt>
                <dd>{profile.username}</dd>
              </div>
              <div>
                <dt>Correo</dt>
                <dd>{profile.email}</dd>
              </div>
              <div>
                <dt>Zona horaria</dt>
                <dd>{profile.timeZone}</dd>
              </div>
            </dl>
          </section>
          <section className="content-card" aria-labelledby="sessions-title">
            <h2 id="sessions-title">Sesiones de contexto</h2>
            {sessions.length === 0 ? (
              <p className="helper">No hay sesiones conocidas.</p>
            ) : (
              <ul className="session-list">
                {sessions.map((knownSession) => (
                  <li key={knownSession.id}>
                    <span>
                      <strong>{knownSession.accountName}</strong>
                      <small>{knownSession.deviceSummary ?? "Dispositivo no identificado"}</small>
                    </span>
                    <span>
                      {knownSession.current
                        ? "Actual"
                        : knownSession.revokedAt === null
                          ? "Activa"
                          : "Cerrada"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
