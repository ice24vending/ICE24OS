import type { AuditEvent } from "@ice24/contracts";

/** Only known producer codes have a label; unknown codes never become user-facing text. */
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
  WorkOrder: "Orden de trabajo",
  Ticket: "Reporte de falla",
};

export const ACTOR_TYPES: Readonly<Record<AuditEvent["actorType"], string>> = {
  USER: "Usuario",
  SYSTEM: "Sistema",
  STRIPE: "Stripe",
};

export const operationLabel = (code: string) => OPERATIONS[code] ?? "Otro evento";
export const entityLabel = (code: string) => ENTITIES[code] ?? "Otro registro";
export const actorLabel = (event: Pick<AuditEvent, "actorName" | "actorType">) =>
  event.actorName ?? ACTOR_TYPES[event.actorType];

export const ORIGINS: Record<AuditEvent["origin"], string> = {
  WEB: "Aplicación web",
  API: "Integración",
  WORKER: "Proceso automático",
  OFFLINE_SYNC: "Sincronización",
  WEBHOOK: "Aviso de un servicio",
  ADMIN: "Administración",
};
export const OUTCOMES = { SUCCESS: "Correcto", DENIED: "Denegado", FAILED: "Fallido" };

const groupFor = (code: string) => {
  if (/Machine|MACHINE|Branch|BRANCH/.test(code)) return "Máquinas";
  if (/Maintenance|Scheduled|WorkOrder|Ticket|ACTIVITY|FREQUENCY|SCHEDULE/.test(code))
    return "Mantenimiento";
  if (/File|FILE/.test(code)) return "Archivos";
  if (/Subscription|SUBSCRIPTION/.test(code)) return "Suscripción";
  if (/Membership|MEMBERSHIP|CONTEXT|NAVIGATION|MODULE/.test(code)) return "Usuarios";
  return "Otros eventos";
};
const groups = (labels: Readonly<Record<string, string>>) =>
  ["Máquinas", "Mantenimiento", "Archivos", "Usuarios", "Suscripción", "Otros eventos"]
    .map((label) => ({
      label,
      options: Object.entries(labels)
        .filter(([code]) => groupFor(code) === label)
        .map(([value, text]) => ({ value, label: text })),
    }))
    .filter((group) => group.options.length);
export const EVENT_GROUPS = groups(OPERATIONS);
export const ENTITY_GROUPS = groups(ENTITIES);

export const auditDate = (value: string, timeZone = "UTC", short = false) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: short ? "2-digit" : "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(short ? {} : { second: "2-digit" as const }),
    hour12: false,
    timeZone,
  }).format(new Date(value));

const FIELDS: Record<string, string> = {
  status: "Estado",
  name: "Nombre",
  code: "Código",
  frequency: "Frecuencia",
  source: "Origen",
  warrantyWarningAcknowledged: "Aviso de garantía aceptado",
  cancelled: "Actividades canceladas",
  created: "Actividades creadas",
  kind: "Tipo",
  verdict: "Resultado del análisis",
  activity: "Actividad",
  minutes: "Minutos",
  address: "Dirección",
  severity: "Prioridad",
  role: "Rol",
  attempts: "Intentos",
  tags: "Etiquetas",
  browser: "Navegador",
  platform: "Sistema operativo",
};
const VALUES: Record<string, string> = {
  DEAD_LETTER: "Requiere revisión",
  QUEUED: "En cola",
  ACTIVE: "Activo",
  active: "Activo",
  available: "Disponible",
  maintenance: "En mantenimiento",
  CLEAN: "Sin amenazas",
  INFECTED: "Amenaza detectada",
  TEMPLATE: "Frecuencia de fábrica",
  MACHINE: "Máquina",
  critical: "Crítica",
  FAILED: "Fallido",
  SUCCESS: "Correcto",
  DENIED: "Denegado",
};
export const fieldLabel = (field: string) => FIELDS[field] ?? "Dato adicional";
export const valueLabel = (value: string) => VALUES[value] ?? value;

/** Existing destinations still authorize the linked resource independently. */
export function entityHref(event: AuditEvent): string | undefined {
  const id = encodeURIComponent(event.entityId);
  switch (event.entityType) {
    case "Machine":
      return `/machines/${id}`;
    case "Branch":
      return `/branches/${id}`;
    case "WorkOrder":
      return `/maintenance/work-orders/${id}`;
    case "Ticket":
      return `/maintenance/tickets/${id}`;
    case "FileObject":
    case "FileVersion":
      return `/files?fileId=${id}`;
    case "Membership":
      return "/account";
    case "Subscription":
      return "/subscription";
    case "Notification":
    case "NotificationEvent":
      return "/notifications";
    case "AsyncJob":
      return "/jobs";
    default:
      return event.machineId
        ? `/machines/${encodeURIComponent(event.machineId)}?tab=maintenance`
        : undefined;
  }
}
