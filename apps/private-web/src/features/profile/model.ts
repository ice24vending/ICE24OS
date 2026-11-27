import type {
  AccessContext,
  ContextCapabilities,
  UserProfile,
  SessionSummary,
  MyActivity,
  MyMfaStatus,
} from "@ice24/contracts";
import type { Failure } from "../../components/system-state/failure";
import { roleName } from "../users/labels";

export interface ProfileData {
  loadedAt: number;
  profile: UserProfile;
  context: AccessContext;
  capabilities: ContextCapabilities;
  scope: string[];
  sessions: SessionSummary[];
  activity: MyActivity[];
  mfa: MyMfaStatus | null;
  mfaFailure: Failure | null;
}
export type ProfileResult = { data: ProfileData; failure: null } | { data: null; failure: Failure };

export const profileRole = (codes: readonly string[]) => codes.map(roleName).join(" · ");

const PERMISSIONS: Record<string, string> = {
  "identity.profile-read": "Consultar tu perfil y tu actividad",
  "identity.profile-update": "Editar tus datos personales",
  "identity.session-revoke": "Cerrar tus sesiones",
  "identity.context-activate": "Cambiar entre tus cuentas disponibles",
  "identity.membership-manage": "Administrar integrantes de la cuenta",
  "identity.recovery-manage": "Gestionar recuperaciones de acceso",
  "maintenance.orders-read": "Consultar órdenes de trabajo",
  "maintenance.orders-assign": "Asignar órdenes de trabajo",
  "maintenance.orders-execute": "Ejecutar órdenes asignadas",
  "maintenance.orders-review": "Revisar órdenes de trabajo",
  "maintenance.tickets-read": "Consultar reportes de servicio",
  "maintenance.tickets-create": "Crear reportes de servicio",
  "maintenance.tickets-edit": "Actualizar reportes de servicio",
  "maintenance.read": "Consultar el mantenimiento programado",
  "equipment.read": "Consultar sucursales y máquinas dentro de tu alcance",
  "equipment.manage": "Administrar sucursales y máquinas",
  "equipment.catalog-manage": "Administrar el catálogo de la cuenta",
  "equipment.machine-components-manage": "Administrar componentes de las máquinas",
  "equipment.account-frequencies-manage": "Configurar frecuencias de mantenimiento de la cuenta",
  "equipment.machine-frequencies-manage": "Configurar frecuencias de las máquinas",
  "equipment.admin": "Administrar el catálogo de ICE24",
  "subscriptions.read": "Consultar la suscripción",
  "subscriptions.admin": "Administrar suscripciones",
  "audit.read": "Consultar la auditoría de la cuenta",
  "audit.security-read": "Consultar eventos de seguridad",
  "audit.global-read": "Consultar la auditoría de la plataforma",
  "jobs.read": "Consultar trabajos en segundo plano",
  "jobs.admin-read": "Consultar trabajos de la plataforma",
  "jobs.retry": "Reintentar trabajos",
  "files.read": "Consultar y descargar archivos",
  "files.upload": "Subir archivos y evidencias",
  "notifications.read": "Consultar avisos",
  "notifications.attend": "Atender tus avisos",
  "notifications.billing-alerts": "Recibir avisos de facturación",
  "notifications.security-alerts": "Recibir avisos de seguridad",
  "accounts.create": "Crear cuentas",
  "accounts.modules-manage": "Administrar módulos de la cuenta",
  "integration-logs.read": "Consultar registros de integraciones",
};
const READ_ONLY_ALLOWED = new Set([
  "identity.profile-update",
  "identity.session-revoke",
  "identity.context-activate",
  "notifications.attend",
]);
export const readablePermissions = (data: Pick<ProfileData, "capabilities" | "context">) =>
  data.capabilities.permissions
    .filter(
      (code) =>
        data.context.accessMode !== "READ_ONLY" ||
        READ_ONLY_ALLOWED.has(code) ||
        /(?:read|alerts)$/.test(code),
    )
    .flatMap((code) => (PERMISSIONS[code] ? [PERMISSIONS[code]] : []));

export const activityLabel = (operation: string) =>
  ({
    "identity.profile-update": "Actualizaste tus datos de perfil",
    CONTEXT_ACTIVATED: "Accediste a la cuenta",
    CONTEXT_REVOKED: "Cerraste una sesión",
    SESSION_REVOKED: "Cerraste una sesión",
    SESSIONS_REVOKED_GLOBAL: "Cerraste tus sesiones",
    USER_REVOKED_OTHER_SESSIONS: "Cerraste las demás sesiones",
    FILE_DOWNLOADED: "Descargaste un archivo",
    FILE_UPLOADED: "Subiste un archivo",
    NAVIGATION_DENIED: "Intentaste abrir una sección sin permiso",
    CONTEXT_FOCUS_CHANGED: "Cambiaste tu selección de trabajo",
    MFA_ENROLLED: "Configuraste la verificación en dos pasos",
  })[operation] ?? "Realizaste una acción en la cuenta";

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("es-MX");

export const timeZoneLabel = (zone: string): string => {
  const labels: Record<string, string> = {
    "America/Mexico_City": "Ciudad de México",
    "America/Cancun": "Cancún",
    "America/Monterrey": "Monterrey",
    "America/Mazatlan": "Mazatlán",
    "America/Hermosillo": "Hermosillo",
    "America/Tijuana": "Tijuana",
    UTC: "Tiempo universal coordinado",
  };
  return (
    labels[zone] ??
    new Intl.DateTimeFormat("es-MX", { timeZone: zone, timeZoneName: "longGeneric" })
      .formatToParts(new Date(0))
      .find((part) => part.type === "timeZoneName")?.value ??
    "Zona horaria de tu cuenta"
  );
};
export const profileDate = (value: string, timeZone: string) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
