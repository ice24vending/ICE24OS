export default function RevokedPage() {
  return (
    <main id="main-content" className="centered-page">
      <section className="access-card access-card--wide" aria-labelledby="revoked-title">
        <p className="step-label">Acceso protegido</p>
        <h1 id="revoked-title">La sesión o el contexto ya no está activo</h1>
        <p className="helper">
          Tus permisos pudieron cambiar o la relación con esta cuenta fue revocada. No se mostró
          información del recurso solicitado.
        </p>
        <a className="button button--primary" href="/access/context">
          Elegir otro contexto
        </a>
      </section>
    </main>
  );
}
