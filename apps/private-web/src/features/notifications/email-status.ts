import type { EmailDeliveryStatus, NotificationEmailDelivery } from "@ice24/contracts";

/** F5-12: technical delivery state of the email copy of a critical alert (TRD 30). */
export const emailStatusLabels: Record<EmailDeliveryStatus, string> = {
  queued: "En cola",
  sent: "Enviado",
  delivered: "Entregado",
  bounced: "Rebotado",
  failed: "Fallido",
};

const utc = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value)) + " UTC";

/** «Entregado (03/10/26, 12:05 UTC)», or null when the alert sends no email. */
export const emailDeliveryText = (delivery: NotificationEmailDelivery | null): string | null =>
  delivery ? `${emailStatusLabels[delivery.status]} (${utc(delivery.updatedAt)})` : null;
