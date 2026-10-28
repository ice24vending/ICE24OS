import type { ReactNode } from "react";
import type { SubscriptionView } from "@ice24/contracts";
import { Banner, StatusTag } from "@ice24/ui";
import { ACCESS, STATUS, formatDate, statusExplanation } from "./model";

const DAY = 86400000;
const DEMO_DAYS = 14;

/** Status card; `children` are the billing actions, drawn in the card footer. */
export function SubscriptionStatus({
  subscription: s,
  now,
  children,
}: {
  subscription: SubscriptionView;
  now: string;
  children?: ReactNode;
}) {
  const days = s.demoExpiresAt
    ? Math.max(0, Math.ceil((Date.parse(s.demoExpiresAt) - Date.parse(now)) / DAY))
    : 0;
  // The contract has no demo start; the bar measures against the standard 14-day demo
  // (apps/api subscriptions domain) and fills up when an extension leaves more days.
  const demoDays = Math.max(DEMO_DAYS, days);
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
          <p id="demo-days">
            {days === 0
              ? "La demo venció. Solicita una extensión a ICE24 o contrata el servicio."
              : `${days} días restantes · Vigente hasta ${formatDate(s.demoExpiresAt!)}`}
          </p>
          <progress
            className="subscription-demo-bar"
            value={days}
            max={demoDays}
            aria-labelledby="demo-days"
          />
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
      <p className="subscription-price">
        <span className="subscription-price__label">Plan mensual</span>
        <span className="subscription-price__amount">
          {new Intl.NumberFormat("es-MX", { style: "currency", currency: s.price.currency }).format(
            s.price.amountMinor / 100,
          )}
        </span>{" "}
        <span className="subscription-price__unit">MXN al mes por cuenta</span>
      </p>
      <dl>
        <dt>Capacidad</dt>
        <dd>Usuarios, sucursales y máquinas ilimitados</dd>
        {s.currentPeriodEnd && (
          <>
            <dt>{s.cancelAtPeriodEnd ? "Acceso pagado hasta" : "Fin del periodo"}</dt>
            <dd>{formatDate(s.currentPeriodEnd)}</dd>
          </>
        )}
        <dt>Comprobantes</dt>
        <dd>
          Consulta el historial y descarga comprobantes en Stripe desde «Gestionar suscripción».
          ICE24 OS no timbra facturas.
        </dd>
      </dl>
      {children && (
        <section aria-label="Gestionar facturación" className="subscription-card__footer">
          {children}
        </section>
      )}
    </section>
  );
}
