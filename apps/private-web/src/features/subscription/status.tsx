import type { SubscriptionView } from "@ice24/contracts";
import { Banner, StatusTag } from "@ice24/ui";
import { ACCESS, STATUS, formatDate, statusExplanation } from "./model";

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
  const status = STATUS[s.status];
  const access = ACCESS[s.accessMode];
  return (
    <section aria-labelledby="subscription-title" className="access-card subscription-card">
      <h1 id="subscription-title">Suscripción</h1>
      <p className="subscription-chips">
        <StatusTag tone={status.tone} dimension="Estado de la suscripción">
          {status.label}
        </StatusTag>
        <StatusTag tone={access.tone} dimension="Acceso de la cuenta">
          {access.label}
        </StatusTag>
      </p>
      <p>{statusExplanation(s)}</p>
      {s.isDemo && (
        <Banner tone="info" title="Datos ficticios" titleAs="p" role="status">
          <p>
            Esta demo es independiente de tu cuenta productiva. Al contratar se crea una cuenta
            limpia.
          </p>
          <p>
            {days === 0
              ? "La demo venció. Solicita una extensión a ICE24 o contrata el servicio."
              : `${days} días restantes · Vigente hasta ${formatDate(s.demoExpiresAt!)}`}
          </p>
        </Banner>
      )}
      {s.accessMode === "READ_ONLY" && (
        <Banner tone="readonly" role="status">
          La cuenta está en modo lectura. Puedes consultar y descargar documentos ya generados; no
          puedes crear ni modificar registros.
        </Banner>
      )}
      {s.accessMode === "SUSPENDED" && (
        <Banner tone="danger" role="alert">
          El acceso está suspendido. Contacta a ICE24.
        </Banner>
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
            <dd>{formatDate(s.currentPeriodEnd)}</dd>
          </>
        )}
        <dt>Comprobantes</dt>
        <dd>Los emite Stripe; ICE24 OS no timbra facturas.</dd>
      </dl>
    </section>
  );
}
