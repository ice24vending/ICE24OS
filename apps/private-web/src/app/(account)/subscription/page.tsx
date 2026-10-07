import { redirect } from "next/navigation";
import { subscriptionViewSchema, type SubscriptionView } from "@ice24/contracts";
import { readBrowserSession } from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { SubscriptionStatus } from "../../../features/subscription/status";
import { BillingActions } from "../../../features/subscription/billing-actions";
import { ServiceState, type ServiceStateKind } from "../../../features/account-shell/service-state";
import "../../../features/subscription/subscription.css";

export const dynamic = "force-dynamic";
export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  let state: { kind: ServiceStateKind; title?: string; message: string };
  let subscription: SubscriptionView | undefined;
  try {
    const response = await callPrivateApi("subscription", session, {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) subscription = subscriptionViewSchema.parse(await response.json());
    state =
      response.status === 401
        ? { kind: "session", message: "Tu sesión expiró. Inicia sesión nuevamente." }
        : response.status === 404
          ? {
              kind: "empty",
              title: "Sin suscripción registrada",
              message: "Esta cuenta todavía no tiene una suscripción registrada.",
            }
          : response.status === 403
            ? {
                kind: "forbidden",
                message: "No tienes permiso para consultar la suscripción de esta cuenta.",
              }
            : { kind: "error", message: "La suscripción no está disponible en este momento." };
  } catch {
    state = {
      kind: "error",
      message: "No fue posible consultar la suscripción. Intenta nuevamente.",
    };
  }
  if (subscription)
    return (
      <main id="main-content">
        <SubscriptionStatus subscription={subscription} now={new Date().toISOString()} />
        <section className="access-card subscription-card" aria-label="Gestionar facturación">
          {subscription.status === "pending_activation" && (
            <div role="status" className="notice">
              <strong>Pago en proceso</strong>
              <p>
                Si completaste el pago, estamos esperando la confirmación de Stripe. El regreso
                desde Checkout no activa la cuenta. Actualiza el estado en unos momentos.
              </p>
            </div>
          )}
          {query.billing === "cancelled" && (
            <p role="status">
              Saliste de Checkout. Puedes continuar la contratación; tu cuenta productiva se
              conserva.
            </p>
          )}
          {query.billing === "returned" && subscription.isDemo && (
            <p role="status">Consulta tu cuenta productiva para verificar el pago.</p>
          )}
          <BillingActions
            key={session.contextId}
            subscription={subscription}
            csrfToken={session.csrfToken}
            contextId={session.contextId}
          />
          <a href="/subscription">Actualizar estado</a>
        </section>
      </main>
    );
  return (
    <main id="main-content" className="access-card subscription-card">
      <h1>Suscripción</h1>
      <ServiceState kind={state.kind} title={state.title} message={state.message}>
        {state.kind === "empty" && <p>ICE24 la crea al aprovisionar la cuenta o la demo.</p>}
        <a href="/subscription">Volver a consultar</a>
      </ServiceState>
    </main>
  );
}
