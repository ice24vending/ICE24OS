import type { SubscriptionStatus, SubscriptionView } from "@ice24/contracts";

export type Tone = "ok" | "warning" | "danger" | "info" | "neutral";

/** RF-SUB-007 states with their label and chip tone (UI/UX 13.4: text, never color alone). */
export const STATUS: Record<SubscriptionStatus, { label: string; tone: Tone }> = {
  demo: { label: "Demo", tone: "info" },
  pending_activation: { label: "Pendiente de activación", tone: "warning" },
  active: { label: "Activa", tone: "ok" },
  payment_failed: { label: "Pago rechazado", tone: "danger" },
  read_only: { label: "Modo lectura", tone: "danger" },
  cancellation_scheduled: { label: "Cancelación programada", tone: "warning" },
  cancelled: { label: "Cancelada", tone: "neutral" },
  reactivated: { label: "Reactivada", tone: "ok" },
};

export const ACCESS: Record<SubscriptionView["accessMode"], { label: string; tone: Tone }> = {
  ACTIVE: { label: "Acceso completo", tone: "ok" },
  READ_ONLY: { label: "Solo lectura", tone: "warning" },
  SUSPENDED: { label: "Suspendida", tone: "danger" },
};

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));

/** What the state means for the account and what happens next (PRD RF-SUB-006 to RF-SUB-010). */
export function statusExplanation(s: SubscriptionView): string {
  const end = s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : null;
  switch (s.status) {
    case "demo":
      return "Cuenta de demostración con datos ficticios, independiente de la cuenta productiva.";
    case "pending_activation":
      return "La cuenta productiva se activa cuando Stripe confirma el pago; mientras tanto permanece en solo lectura.";
    case "active":
      return end ? `El cobro mensual se renueva el ${end}.` : "La suscripción está al corriente.";
    case "reactivated":
      return "Stripe confirmó el pago y la cuenta recuperó el acceso completo.";
    case "payment_failed":
      return "Stripe rechazó el cobro. La cuenta pasó a solo lectura de inmediato y se reactiva automáticamente cuando Stripe confirme el pago.";
    case "read_only":
      return "La cuenta no tiene un pago vigente: puedes consultar y descargar lo existente, pero no crear ni modificar.";
    case "cancellation_scheduled":
      return end
        ? `Solicitaste la cancelación. Conservas el acceso hasta el ${end}; después la cuenta queda en solo lectura.`
        : "Solicitaste la cancelación. Conservas el acceso hasta el fin del periodo pagado.";
    case "cancelled":
      return "La suscripción terminó. La información se conserva en solo lectura; puedes contratar de nuevo.";
  }
}

export type BillingAction = "checkout" | "portal";

export interface BillingOption {
  readonly action: BillingAction;
  readonly label: string;
  readonly description: string;
}

export interface BillingOptions {
  readonly options: BillingOption[];
  /** Why there are no actions, or a note that applies to all of them. */
  readonly note: string | null;
}

const PORTAL_PURPOSE: Partial<Record<SubscriptionStatus, string>> = {
  active: "Cambia el método de pago, consulta comprobantes o programa la cancelación en Stripe.",
  reactivated:
    "Cambia el método de pago, consulta comprobantes o programa la cancelación en Stripe.",
  payment_failed: "Actualiza el método de pago en Stripe para que se reintente el cobro.",
  read_only: "Actualiza el método de pago en Stripe para recuperar el acceso.",
  cancellation_scheduled: "Reanuda la suscripción o consulta comprobantes en Stripe.",
  cancelled: "Consulta comprobantes anteriores en Stripe.",
  pending_activation: "Revisa en Stripe el estado del pago que iniciaste.",
};

/**
 * Billing actions allowed by state and permission. Billing is owner-only and blocked when the
 * account is suspended (the API re-checks both). `owner` is null when the context is unknown:
 * then the actions are offered and the API answers with the exact reason.
 */
export function billingOptions(s: SubscriptionView, owner: boolean | null): BillingOptions {
  if (s.accessMode === "SUSPENDED")
    return {
      options: [],
      note: "El acceso está suspendido; la facturación no está disponible. Contacta a ICE24.",
    };
  if (owner === false)
    return {
      options: [],
      note: "Solo el propietario de la cuenta puede contratar o gestionar la suscripción.",
    };
  const options: BillingOption[] = [];
  if (s.isDemo || s.status === "pending_activation" || s.status === "cancelled")
    options.push({
      action: "checkout",
      label: "Contratar con Stripe",
      description: s.isDemo
        ? "Crea una cuenta productiva limpia; los datos ficticios no se transfieren."
        : s.status === "cancelled"
          ? "Inicia una nueva suscripción mensual."
          : "Retoma el pago pendiente con la misma solicitud.",
    });
  if (s.isDemo || s.providerCustomerId)
    options.push({
      action: "portal",
      label: "Gestionar suscripción",
      description: s.isDemo
        ? "Si ya contrataste, gestiona la cuenta productiva."
        : (PORTAL_PURPOSE[s.status] ?? "Gestiona la suscripción en Stripe."),
    });
  return {
    options,
    note: "El pago se captura en Stripe. ICE24 OS nunca recibe ni guarda datos de tarjeta.",
  };
}
