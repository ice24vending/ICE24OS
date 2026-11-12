export function AccessBrandPanel() {
  return (
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
  );
}
