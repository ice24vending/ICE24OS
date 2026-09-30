import { redirect } from "next/navigation";
import { subscriptionViewSchema, type SubscriptionView } from "@ice24/contracts";
import { readBrowserSession } from "../../server/session/session";
import { callPrivateApi } from "../../server/session/supabase-auth";
import { SubscriptionStatus } from "../../features/subscription/status";
import "../../features/subscription/subscription.css";

export const dynamic = "force-dynamic";
export default async function SubscriptionPage() {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  let message: string;
  let subscription: SubscriptionView | undefined;
  try {
    const response = await callPrivateApi("subscription", session, {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      subscription = subscriptionViewSchema.parse(await response.json());
    }
    message =
      response.status === 401
        ? "Tu sesión expiró. Inicia sesión nuevamente."
        : response.status === 404
          ? "Esta cuenta todavía no tiene una suscripción registrada."
          : response.status === 403
            ? "No tienes permiso para consultar la suscripción de esta cuenta."
            : "La suscripción no está disponible en este momento.";
  } catch {
    message = "No fue posible consultar la suscripción. Intenta nuevamente.";
  }
  if (subscription)
    return (
      <main id="main-content">
        <SubscriptionStatus subscription={subscription} now={new Date().toISOString()} />
      </main>
    );
  return (
    <main id="main-content" className="access-card subscription-card">
      <h1>Suscripción</h1>
      <p role="status">{message}</p>
      <a href="/subscription">Volver a consultar</a>
      <a href="/workspace">Volver al espacio de trabajo</a>
    </main>
  );
}
