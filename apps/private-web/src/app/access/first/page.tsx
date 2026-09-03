import { redirect } from "next/navigation";

import { readBrowserSession } from "../../../server/session/session";

export const dynamic = "force-dynamic";

type FirstAccessPageProps = {
  readonly searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
};

export default async function FirstAccessPage({ searchParams }: FirstAccessPageProps) {
  const session = await readBrowserSession();
  if (session === undefined) redirect("/?error=expired");
  const query = await searchParams;
  return (
    <main id="main-content" className="centered-page">
      <section className="access-card access-card--wide" aria-labelledby="first-access-title">
        <p className="step-label">Primer ingreso · Paso 1 de 2</p>
        <h1 id="first-access-title">Crea una contraseña nueva</h1>
        <p className="helper">
          La contraseña temporal deja de ser válida después del cambio. No reutilices una contraseña
          de otro servicio.
        </p>
        {query.error === "change" && (
          <div className="notice notice--error" role="alert">
            No pudimos guardar la contraseña. Verifica los requisitos e intenta nuevamente.
          </div>
        )}
        <form className="form-stack" method="post" action="/api/auth/password">
          <input type="hidden" name="csrfToken" value={session.csrfToken} />
          <label>
            Contraseña nueva
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
          <p className="fine-print">
            Usa al menos 12 caracteres. El proveedor aplica controles adicionales.
          </p>
          <button className="button button--primary" type="submit">
            Guardar y configurar seguridad
          </button>
        </form>
      </section>
    </main>
  );
}
