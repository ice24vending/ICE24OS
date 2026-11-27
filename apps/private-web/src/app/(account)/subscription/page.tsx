import { redirect } from "next/navigation";
import { Suspense } from "react";
import { randomUUID } from "node:crypto";
import { PageWidth } from "@ice24/ui";
import {
  subscriptionPaymentsSchema,
  subscriptionViewSchema,
  type SubscriptionView,
} from "@ice24/contracts";
import { readBrowserSession, type BrowserSession } from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { SubscriptionStatus } from "../../../features/subscription/status";
import { BillingActions } from "../../../features/subscription/billing-actions";
import {
  ServiceState,
  type ServiceStateKind,
} from "../../../components/system-state/service-state";
import "../../../features/subscription/subscription.css";
import { guardDestination, loadAccountShell } from "../../../server/account/shell";
import { DestinationDenied } from "../../../features/navigation/destination-denied";
import { PaymentHistory } from "../../../features/subscription/payment-history";
import { upstreamCorrelation } from "../../../server/bff/responses";
import { demoStateOf } from "../../../server/demo/session";
import { demoIds } from "../../../server/demo/fixtures";
import type { Failure } from "../../../components/system-state/failure";

export const metadata = { title: "Suscripción" };

export const dynamic = "force-dynamic";
async function History({
  session,
  subscription,
  canManage,
}: {
  session: BrowserSession;
  subscription: SubscriptionView;
  canManage: boolean;
}) {
  const props = {
    contextId: session.contextId!,
    csrfToken: session.csrfToken,
    canManage,
    canOpenPortal: Boolean(subscription.providerCustomerId) && !subscription.isDemo,
  };
  if (!canManage) return <PaymentHistory {...props} />;
  let failure: Failure | undefined;
  let payments;
  const demo = demoStateOf(session);
  const folio = demo ? demoIds.correlation(999) : randomUUID();
  try {
    const response = await callPrivateApi("subscription/payments", session, {
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) payments = subscriptionPaymentsSchema.parse(await response.json());
    else
      failure = {
        kind: response.status === 403 ? "forbidden" : "error",
        status: response.status,
        message: "No fue posible consultar el historial de pagos.",
        correlationId: (await upstreamCorrelation(response)) ?? folio,
      };
  } catch {
    failure = {
      kind: demo?.network === "offline" ? "offline" : "error",
      status: 503,
      message: "No fue posible consultar el historial de pagos.",
      correlationId: folio,
    };
  }
  return <PaymentHistory {...props} payments={payments} failure={failure} />;
}
export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const denied = await guardDestination("subscription");
  if (denied) return <DestinationDenied denied={denied} />;
  const shell = await loadAccountShell(session);
  let state: {
    kind: ServiceStateKind;
    title?: string;
    message: string;
    correlationId?: string | undefined;
  };
  const demo = demoStateOf(session);
  const folio = demo ? demoIds.correlation(999) : randomUUID();
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
    if (!response.ok) state.correlationId = (await upstreamCorrelation(response)) ?? folio;
  } catch {
    state = {
      kind: demo?.network === "offline" ? "offline" : "error",
      message: "No fue posible consultar la suscripción. Intenta nuevamente.",
      correlationId: folio,
    };
  }
  if (subscription)
    return (
      <PageWidth as="main" id="main-content" data-page-ready="true" className="subscription-page">
        <SubscriptionStatus
          subscription={subscription}
          now={new Date().toISOString()}
          aside={
            <Suspense
              fallback={
                <PaymentHistory
                  loading
                  contextId={session.contextId}
                  csrfToken={session.csrfToken}
                />
              }
            >
              <History
                session={session}
                subscription={subscription}
                canManage={shell.billingOwner}
              />
            </Suspense>
          }
        >
          {subscription.status === "pending_activation" && (
            <div role="status" className="notice">
              <strong>Pago en proceso</strong>
              <p>
                Si completaste el pago, estamos esperando su confirmación. Actualiza el estado en
                unos momentos.
              </p>
            </div>
          )}
          {query.billing === "cancelled" && (
            <p role="status">
              Saliste de la página de pago. Puedes continuar la contratación; tu cuenta productiva
              se conserva.
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
        </SubscriptionStatus>
      </PageWidth>
    );
  return (
    <PageWidth as="main" id="main-content" data-page-ready="true" className="subscription-page">
      <h1>Suscripción</h1>
      <ServiceState
        kind={state.kind}
        title={state.title}
        message={state.message}
        correlationId={state.correlationId}
      >
        {state.kind === "empty" && <p>ICE24 la crea al aprovisionar la cuenta o la demo.</p>}
        <a href="/subscription">Volver a consultar</a>
      </ServiceState>
    </PageWidth>
  );
}
