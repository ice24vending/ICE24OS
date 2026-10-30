import type { AuditEvent } from "@ice24/contracts";

/** Spanish names for the codes producers write; the raw code stays in the detail and filters. */
const OPERATIONS: Readonly<Record<string, string>> = {
  JobRetryRequested: "Reintento de trabajo solicitado",
  FileReadAuthorized: "Descarga de archivo autorizada",
  FileReadDenied: "Descarga de archivo denegada",
  FileUploadAuthorized: "Subida de archivo autorizada",
  FileUploadCompleted: "Archivo subido",
  FileUploadAborted: "Subida de archivo cancelada",
  FileUploadRejected: "Archivo rechazado",
  FileIntegrityRejected: "Archivo rechazado por integridad",
  FileMalwareDetected: "Archivo con malware detectado",
  FileQuarantined: "Archivo en cuarentena",
  FileObjectPurged: "Archivo eliminado definitivamente",
  FileScanCompleted: "Análisis de archivo terminado",
  FileScanAttemptFailed: "Falló un análisis de archivo",
  FileScanRequeued: "Análisis de archivo reprogramado",
  FileSecurityAlertRaised: "Alerta de seguridad de archivo",
  EmailRequested: "Correo solicitado",
  EmailQueued: "Correo en cola",
  EmailRequeued: "Correo reprogramado",
  EmailSent: "Correo enviado",
  EmailDelivered: "Correo entregado",
  EmailBounced: "Correo rebotado",
  EmailRecipientRejected: "Destinatario de correo rechazado",
  EmailDeliveryAttemptFailed: "Falló un intento de envío de correo",
  EmailFailed: "Correo no enviado",
  NotificationCreated: "Aviso creado",
  NotificationRead: "Aviso leído",
  NotificationAcknowledged: "Aviso enterado",
  NotificationAttentionStarted: "Atención de aviso iniciada",
  NotificationResolved: "Aviso resuelto",
  CONTEXT_FOCUS_CHANGED: "Cambio de sucursal o máquina",
  MODULE_CONFIGURATION_CHANGED: "Configuración de módulo cambiada",
  NAVIGATION_DENIED: "Acceso a pantalla denegado",
  // Demo mode (server/demo/api.ts).
  FREQUENCY_OVERRIDE_CREATED: "Frecuencia de mantenimiento ajustada",
  FREQUENCY_OVERRIDE_REMOVED: "Frecuencia de fábrica restaurada",
  SCHEDULE_RECALCULATED: "Calendario recalculado",
  FILE_UPLOAD_CONFIRMED: "Archivo subido",
  FILE_UPLOAD_REJECTED: "Archivo rechazado",
  MACHINE_CREATED: "Máquina dada de alta",
  MACHINE_UPDATE: "Máquina editada",
  MACHINE_STATUS_CHANGED: "Estado de máquina cambiado",
  ACTIVITY_COMPLETED: "Mantenimiento completado",
  BRANCH_UPDATED: "Sucursal editada",
  NOTIFICATION_CREATED: "Aviso creado",
  MEMBERSHIP_INVITED: "Usuario invitado",
  SUBSCRIPTION_RENEWED: "Suscripción renovada",
};

const ENTITIES: Readonly<Record<string, string>> = {
  AsyncJob: "Trabajo",
  Branch: "Sucursal",
  EmailMessage: "Correo",
  FileObject: "Archivo",
  FileVersion: "Versión de archivo",
  Machine: "Máquina",
  MaintenanceActivity: "Mantenimiento",
  MaintenanceFrequencyOverride: "Frecuencia de mantenimiento",
  Membership: "Usuario de la cuenta",
  Notification: "Aviso",
  NotificationEvent: "Aviso",
  ScheduledActivity: "Actividad programada",
  ScheduledWindow: "Ventana programada",
  Subscription: "Suscripción",
};

const ACTOR_TYPES: Readonly<Record<AuditEvent["actorType"], string>> = {
  USER: "Usuario",
  SYSTEM: "Sistema",
  STRIPE: "Stripe",
};

/** "FileScanRequeued" or "FILE_SCAN_REQUEUED" → "File scan requeued" for codes not listed yet. */
export const humanize = (code: string) => {
  const words = code
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_.]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const operationLabel = (code: string) => OPERATIONS[code] ?? humanize(code);
export const entityLabel = (code: string) => ENTITIES[code] ?? humanize(code);
export const actorLabel = (event: Pick<AuditEvent, "actorName" | "actorType">) =>
  event.actorName ?? ACTOR_TYPES[event.actorType];
