import type { Row } from "../equipment/workspace";
import { backHref } from "../navigation/deep-links";
export const SECTIONS = {
  modelos: "Catálogos y plantillas",
  validaciones: "Validaciones",
  cuentas: "Cuentas ICE24",
  panel: "Panel ICE24",
} as const;
export type AdminSection = keyof typeof SECTIONS | "plantillas";
export const isAdminSection = (value: string): value is AdminSection =>
  value === "plantillas" || Object.hasOwn(SECTIONS, value);
export const rowLabel = (row: Row) =>
  String(
    row.name ??
      row.data?.name ??
      row.folio ??
      row.code ??
      (row.version_number ? `Versión ${String(row.version_number)}` : "Registro"),
  );
const STATES: Record<string, string> = {
  ACTIVE: "Activo",
  READ_ONLY: "Solo lectura",
  SUSPENDED: "Suspendido",
  active: "Activo",
  draft: "Borrador",
  submitted: "Enviada",
  in_review: "En revisión",
  information_required: "Información requerida",
  rejected: "Rechazada",
  published: "Publicada",
  superseded: "Sustituida",
  archived: "Archivado",
};
export const stateLabel = (row: Row) =>
  STATES[String(row.status ?? row.access_mode)] ?? "Sin estado";
export const detailTitle = (section: AdminSection) =>
  ({
    modelos: "Detalle del modelo",
    plantillas: "Detalle de plantilla",
    cuentas: "Detalle de cuenta",
    validaciones: "Detalle de validación",
    panel: "Panel ICE24",
  })[section];
export function adminReturn(value: string | null | undefined, section: AdminSection) {
  const fallback = `/ice24?seccion=${section === "plantillas" ? "modelos" : section}`;
  const safe = backHref(value, fallback);
  const path = new URL(safe, "https://ice24.invalid").pathname;
  return path === "/ice24" || /^\/ice24\/modelos\/[0-9a-f-]{36}$/i.test(path) ? safe : fallback;
}
