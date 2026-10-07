import type { AccessContext, SubscriptionStatus, SubscriptionView } from "@ice24/contracts";

export type AccessMode = AccessContext["accessMode"];

/** Why the account is read-only and what the viewer can do about it (UI/UX 13.7 and 25). */
export interface ReadOnlyNotice {
  readonly reason: string;
  readonly action: string;
}

/**
 * Billing actions are reserved to an account-wide owner (the API re-checks it on every call,
 * see `assertBillingOwner`); the UI only uses this to hide actions the viewer can never take.
 */
export const isBillingOwner = (
  context: Pick<AccessContext, "roleCodes" | "branchIds" | "machineIds">,
) =>
  context.roleCodes.includes("OW") &&
  context.branchIds.length === 0 &&
  context.machineIds.length === 0;

const REASONS: Partial<Record<SubscriptionStatus, string>> = {
  payment_failed: "Stripe rechazó el último pago de la suscripción.",
  read_only: "La suscripción no tiene un pago vigente.",
  pending_activation: "La activación espera la confirmación del pago en Stripe.",
  cancelled: "La suscripción fue cancelada.",
  cancellation_scheduled: "El periodo pagado terminó después de la cancelación programada.",
  demo: "La vigencia de la demo terminó.",
};

/**
 * Message for the global read-only banner. `status` is null when the subscription could not be
 * read (no permission or unavailable): the account may also be restricted by ICE24 directly.
 */
export function readOnlyNotice(
  subscription: Pick<SubscriptionView, "status" | "isDemo"> | null,
  owner: boolean,
): ReadOnlyNotice {
  const reason =
    (subscription && (subscription.isDemo ? REASONS.demo : REASONS[subscription.status])) ??
    "La cuenta tiene restringidas las modificaciones.";
  const action = subscription?.isDemo
    ? owner
      ? "Contrata el servicio o solicita a ICE24 una extensión de la demo."
      : "Pide al propietario de la cuenta que contrate el servicio o solicite una extensión."
    : owner
      ? "Revisa la suscripción para regularizar el pago; el acceso se restablece en cuanto Stripe lo confirme."
      : "Pide al propietario de la cuenta que regularice la suscripción.";
  return { reason, action };
}

/** Text of a write control disabled by the access mode (shown next to it, never only a tooltip). */
export const writeBlockedText = (mode: AccessMode) =>
  mode === "SUSPENDED"
    ? "El acceso a esta cuenta está suspendido. Contacta a ICE24."
    : "La cuenta está en modo lectura: puedes consultar y descargar, pero no crear ni modificar.";
