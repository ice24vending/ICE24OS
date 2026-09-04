import { redirect } from "next/navigation";

import { readBrowserSession } from "../../../server/session/session";

export const dynamic = "force-dynamic";

type MfaPageProps = {
  readonly searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
};

export default async function MfaPage({ searchParams }: MfaPageProps) {
  const session = await readBrowserSession();
  if (session === undefined) redirect("/?error=expired");
  const query = await searchParams;
  const pending = session.pendingMfa;
  return (
    <main id="main-content" className="centered-page">
      <section className="access-card access-card--wide" aria-labelledby="mfa-title">
        <p className="step-label">Primer ingreso · Paso 2 de 2</p>
        <h1 id="mfa-title">Protege tu cuenta con TOTP</h1>
        <p className="helper">
          Es obligatorio para administradores ICE24, propietarios, responsables sanitarios y
          publicadores. La semilla sólo se muestra durante esta configuración.
        </p>
        {typeof query.error === "string" && (
          <div className="notice notice--error" role="alert">
            No fue posible completar la verificación. Solicita un código nuevo e intenta otra vez.
          </div>
        )}
        {pending === undefined ? (
          <form method="post" action="/api/auth/mfa/enroll">
            <input type="hidden" name="csrfToken" value={session.csrfToken} />
            <button className="button button--primary" type="submit">
              Configurar aplicación autenticadora
            </button>
          </form>
        ) : (
          <div className="form-stack">
            <div className="totp-secret" role="group" aria-labelledby="totp-secret-title">
              <strong id="totp-secret-title">Clave de configuración manual</strong>
              <code>{pending.secret}</code>
              <p className="fine-print">Agrégala en tu aplicación TOTP y no la compartas.</p>
            </div>
            <form className="form-stack" method="post" action="/api/auth/mfa/verify">
              <input type="hidden" name="csrfToken" value={session.csrfToken} />
              <label>
                Código de 6 dígitos
                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  required
                />
              </label>
              <button className="button button--primary" type="submit">
                Verificar segundo factor
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
