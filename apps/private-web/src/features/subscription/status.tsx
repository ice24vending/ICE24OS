import type { SubscriptionView } from "@ice24/contracts";

const labels: Record<SubscriptionView["status"], string> = {
  demo: "Demo",
  pending_activation: "Pendiente de activación",
  active: "Activa",
  payment_failed: "Pago rechazado",
  read_only: "Modo lectura",
  cancellation_scheduled: "Cancelación programada",
  cancelled: "Cancelada",
  reactivated: "Reactivada",
};
const date = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
export function SubscriptionStatus({
  subscription: s,
  now,
}: {
  subscription: SubscriptionView;
  now: string;
}) {
  const days = s.demoExpiresAt
    ? Math.max(0, Math.ceil((Date.parse(s.demoExpiresAt) - Date.parse(now)) / 86400000))
    : 0;
  return (
    <section aria-labelledby="subscription-title" className="access-card subscription-card">
      <h1 id="subscription-title">Suscripción</h1>
      <p>
        <strong>{labels[s.status]}</strong>
      </p>
      {s.isDemo && (
        <div className="notice" role="status">
          <strong>Datos ficticios</strong>
          <p>
            Esta demo es independiente de tu cuenta productiva. Al contratar se crea una cuenta
            limpia.
          </p>
          <p>
            {days === 0
              ? "La demo venció. Solicita una extensión a ICE24 o contrata el servicio."
              : `${days} días restantes · Vigente hasta ${date(s.demoExpiresAt!)}`}
          </p>
        </div>
      )}
      {s.accessMode === "READ_ONLY" && (
        <div className="notice" role="status">
          La cuenta está en modo lectura. Puedes consultar y descargar documentos ya generados; no
          puedes crear ni modificar registros.
        </div>
      )}
      {s.accessMode === "SUSPENDED" && (
        <p role="alert">El acceso está suspendido. Contacta a ICE24.</p>
      )}
      <dl>
        <dt>Plan mensual</dt>
        <dd>
          {new Intl.NumberFormat("es-MX", { style: "currency", currency: s.price.currency }).format(
            s.price.amountMinor / 100,
          )}{" "}
          MXN por cuenta
        </dd>
        <dt>Capacidad</dt>
        <dd>Usuarios, sucursales y máquinas ilimitados</dd>
        {s.currentPeriodEnd && (
          <>
            <dt>{s.cancelAtPeriodEnd ? "Acceso pagado hasta" : "Fin del periodo"}</dt>
            <dd>{date(s.currentPeriodEnd)}</dd>
          </>
        )}
      </dl>
      <a href="/workspace">Volver al espacio de trabajo</a>
    </section>
  );
}
