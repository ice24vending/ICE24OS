"use client";

import { useRef, useState } from "react";
import type { SubscriptionView } from "@ice24/contracts";
import { useAccountAccess } from "../account-shell/access-provider";
import { request, toFailure, type Failure } from "../account-shell/failure";
import { ServiceState } from "../account-shell/service-state";
import { billingOptions, type BillingAction } from "./model";

export function BillingActions({
  subscription,
  csrfToken,
  contextId,
}: {
  subscription: SubscriptionView;
  csrfToken: string;
  contextId: string;
}) {
  const access = useAccountAccess();
  const [loading, setLoading] = useState<BillingAction | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const keys = useRef<Record<string, string>>({});
  const busy = useRef(false);
  // Unknown context (shell could not read it): offer the actions and let the API decide.
  const { options, note } = billingOptions(
    subscription,
    access.mode === null ? null : access.billingOwner,
  );
  async function open(action: BillingAction) {
    if (busy.current) return;
    busy.current = true;
    setLoading(action);
    setFailure(null);
    try {
      const form = new FormData();
      form.set("csrfToken", csrfToken);
      form.set("action", action);
      // Preserve the key for retries after an ambiguous network failure.
      form.set("key", (keys.current[action] ??= crypto.randomUUID()));
      const response = await request(
        "/api/subscription",
        { method: "POST", body: form, headers: { "x-ice24-workspace-context": contextId } },
        "No fue posible abrir Stripe. Intenta nuevamente.",
      );
      const result = (await response.json()) as { url?: string };
      if (!result.url) throw new Error("Missing billing URL");
      window.location.assign(result.url);
    } catch (cause) {
      setFailure(toFailure(cause, "No fue posible abrir Stripe. Intenta nuevamente."));
      setLoading(null);
      busy.current = false;
    }
  }
  return (
    <div className="subscription-actions" aria-busy={loading !== null}>
      <h2>Acciones disponibles</h2>
      {options.length > 0 ? (
        <ul>
          {options.map((option) => (
            <li key={option.action}>
              <button
                type="button"
                disabled={loading !== null || !access.online}
                aria-describedby={`billing-${option.action}-help`}
                onClick={() => void open(option.action)}
              >
                {loading === option.action
                  ? option.action === "checkout"
                    ? "Abriendo Checkout…"
                    : "Abriendo Portal…"
                  : option.label}
              </button>
              <p id={`billing-${option.action}-help`}>{option.description}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {note && <p>{note}</p>}
      {subscription.isDemo && options.length > 0 && (
        <p>
          Al continuar se abrirá tu cuenta productiva. Puedes volver a la demo desde Cambiar de
          cuenta.
        </p>
      )}
      {!access.online && options.length > 0 && (
        <p className="write-blocked">Necesitas conexión para abrir Stripe.</p>
      )}
      {loading && <p role="status">Conectando con Stripe…</p>}
      {failure &&
        (failure.kind === "conflict" ? (
          <ServiceState
            kind="conflict"
            message={failure.message}
            onRetry={() => window.location.reload()}
            retryLabel="Actualizar estado"
          />
        ) : (
          <p role="alert">{failure.message}</p>
        ))}
    </div>
  );
}
