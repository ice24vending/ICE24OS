"use client";

import { useRef, useState } from "react";
import type { SubscriptionView } from "@ice24/contracts";

export function BillingActions({
  subscription,
  csrfToken,
  contextId,
}: {
  subscription: SubscriptionView;
  csrfToken: string;
  contextId: string;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const keys = useRef<Record<string, string>>({});
  const busy = useRef(false);
  async function open(action: "checkout" | "portal") {
    if (busy.current) return;
    busy.current = true;
    setLoading(action);
    setError("");
    try {
      const form = new FormData();
      form.set("csrfToken", csrfToken);
      form.set("action", action);
      // Preserve the key for retries after an ambiguous network failure.
      form.set("key", (keys.current[action] ??= crypto.randomUUID()));
      const response = await fetch("/api/subscription", {
        method: "POST",
        body: form,
        headers: { "x-ice24-workspace-context": contextId },
      });
      const result = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !result.url)
        throw new Error(result.message ?? "No fue posible abrir Stripe.");
      window.location.assign(result.url);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No fue posible abrir Stripe. Intenta nuevamente.",
      );
      setLoading(null);
      busy.current = false;
    }
  }
  if (subscription.accessMode === "SUSPENDED") return null;
  const checkout =
    subscription.isDemo || ["pending_activation", "cancelled"].includes(subscription.status);
  return (
    <div className="subscription-actions" aria-busy={loading !== null}>
      <p>Estas acciones están disponibles para el propietario de la cuenta.</p>
      {checkout && (
        <button type="button" disabled={loading !== null} onClick={() => void open("checkout")}>
          {loading === "checkout" ? "Abriendo Checkout…" : "Contratar con Stripe"}
        </button>
      )}
      {(subscription.isDemo || subscription.providerCustomerId) && (
        <button type="button" disabled={loading !== null} onClick={() => void open("portal")}>
          {loading === "portal" ? "Abriendo Portal…" : "Gestionar suscripción"}
        </button>
      )}
      {subscription.isDemo && (
        <p>
          Al continuar se abrirá tu cuenta productiva. Puedes volver a la demo desde Cambiar de
          cuenta. Si ya contrataste, usa Gestionar suscripción.
        </p>
      )}
      {loading && <p role="status">Conectando con Stripe…</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
