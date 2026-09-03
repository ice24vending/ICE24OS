type LoginPageProps = {
  readonly searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const accessError = query.error === "access";
  const expired = query.error === "expired";
  const recoverySent = query.recovery === "sent";

  return (
    <main id="main-content" className="access-layout">
      <section className="brand-panel" aria-labelledby="access-title">
        <p className="eyebrow">Acceso privado · Fase 3</p>
        <h1 id="access-title">ICE24 OS</h1>
        <p className="lead">
          Identidad única, contextos separados y autorización verificable para cada cuenta.
        </p>
        <ul className="trust-list" aria-label="Controles de acceso">
          <li>Sesión protegida en el servidor</li>
          <li>Segundo factor para acciones críticas</li>
          <li>Denegación por defecto y auditoría</li>
        </ul>
      </section>

      <section className="access-card" aria-labelledby="login-title">
        <div>
          <p className="step-label">Acceso autorizado</p>
          <h2 id="login-title">Inicia sesión</h2>
          <p className="helper">Usa la cuenta que ICE24 o el propietario te invitó a activar.</p>
        </div>

        {(accessError || expired) && (
          <div className="notice notice--error" role="alert">
            {expired
              ? "La sesión terminó. Ingresa nuevamente para proteger tu información."
              : "No fue posible iniciar sesión. Revisa tus datos o espera antes de intentar otra vez."}
          </div>
        )}
        {recoverySent && (
          <div className="notice notice--success" role="status">
            Si la cuenta existe, enviaremos instrucciones al correo verificado.
          </div>
        )}

        <form className="form-stack" method="post" action="/api/auth/login">
          <label>
            Correo
            <input name="email" type="email" autoComplete="username" required maxLength={320} />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={12}
            />
          </label>
          <button className="button button--primary" type="submit">
            Continuar
          </button>
        </form>
        <a className="button button--secondary oidc-link" href="/api/auth/authorize">
          Continuar con acceso OIDC + PKCE
        </a>

        <details className="recovery-panel">
          <summary>¿Olvidaste tu contraseña?</summary>
          <form
            className="form-stack form-stack--compact"
            method="post"
            action="/api/auth/recovery"
          >
            <label>
              Correo verificado
              <input name="email" type="email" autoComplete="email" required maxLength={320} />
            </label>
            <button className="button button--secondary" type="submit">
              Enviar instrucciones
            </button>
          </form>
          <p className="fine-print">
            Si perdiste el correo o tu segundo factor, soporte abrirá un caso con verificación por
            dos personas. Nunca te pediremos una contraseña o un código TOTP.
          </p>
        </details>
      </section>
    </main>
  );
}
