import { jobQuerySchema, jobStatusSchema, type AsyncJob, type JobStatus } from "@ice24/contracts";
import { jobStatusLabel } from "@ice24/ui";
import { backHref } from "../navigation/deep-links";

export const statusLabels = Object.fromEntries(
  jobStatusSchema.options.map((status) => [status, jobStatusLabel(status)]),
) as Record<JobStatus, string>;
export const jobTypes: Record<string, string> = {
  DOMAIN_EVENT: "Actualización de operación",
  SCHEDULE_RECALC: "Actualización de calendario",
  FILE_SCAN: "Revisión de archivo",
  EMAIL_DELIVERY: "Envío de correo",
  SUBSCRIPTION_RECONCILE: "Revisión de suscripción",
  SCHEDULED_TASK: "Tarea programada",
};
export const queueLabels: Record<string, string> = {
  domain_events: "Actualizaciones de operación",
  file_scans: "Revisión de archivos",
  email_delivery: "Envíos de correo",
  emails: "Envíos de correo",
  scheduled_tasks: "Tareas programadas",
};
export const jobName = (job: Pick<AsyncJob, "type">) =>
  jobTypes[job.type] ?? "Proceso de operación";
export const queueName = (queue: string) => queueLabels[queue] ?? "Procesamiento de trabajos";
export const jobDate = (value: string | null) =>
  value === null
    ? "Sin registro"
    : new Intl.DateTimeFormat("es-MX", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "America/Mexico_City",
        hour12: false,
      }).format(new Date(value));
export function jobFilters(input: Record<string, string | string[] | undefined>) {
  const allowed = ["status", "type", "queue", "cursor", "accountId", "from", "to"];
  const values = Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => allowed.includes(key) && typeof value === "string" && value !== "",
    ),
  );
  const result = jobQuerySchema.safeParse({ ...values, limit: 25 });
  return result.success
    ? new URLSearchParams(
        Object.entries(result.data).map(([key, value]) => [key, String(value)]),
      ).toString()
    : "limit=25";
}
export function jobsReturn(value: string | null | undefined) {
  const safe = backHref(value, "/jobs");
  return new URL(safe, "https://ice24.invalid").pathname === "/jobs" ? safe : "/jobs";
}
