import type {
  EquipmentConfigurationAccess,
  MachineComponentOrigin,
  FrequencyOverride,
} from "@ice24/contracts";

/** Frequency as the API returns it (F4-20): a positive integer and its unit. */
export interface FrequencyValue {
  readonly value: number;
  readonly unit: "days" | "weeks" | "months";
}
export type FrequencySource = "TEMPLATE" | "ACCOUNT" | "MACHINE";

const UNITS: Record<FrequencyValue["unit"], [string, string]> = {
  days: ["día", "días"],
  weeks: ["semana", "semanas"],
  months: ["mes", "meses"],
};
export const UNIT_OPTIONS: { value: FrequencyValue["unit"]; label: string }[] = [
  { value: "days", label: "Días" },
  { value: "weeks", label: "Semanas" },
  { value: "months", label: "Meses" },
];

/** "Cada 10 días", "Cada semana"… for lists; "Sin anticipación" when there is no value. */
export function formatFrequency(value: FrequencyValue | null | undefined, empty = "—"): string {
  if (!value) return empty;
  const [one, many] = UNITS[value.unit];
  return `${value.value} ${value.value === 1 ? one : many}`;
}

export const SOURCE_LABELS: Record<FrequencySource, string> = {
  TEMPLATE: "Fábrica ICE24",
  ACCOUNT: "Configuración de la cuenta",
  MACHINE: "Esta máquina",
};
/** For an own component (RA-01-D3) the "template" value is the default the client defined. */
export const sourceLabel = (source: FrequencySource, ownComponent: boolean): string =>
  ownComponent && source === "TEMPLATE"
    ? "Valor por defecto del componente"
    : SOURCE_LABELS[source];
export const ORIGIN_LABELS: Record<MachineComponentOrigin, string> = {
  TEMPLATE_DEFAULT: "Fábrica (plantilla del modelo)",
  TEMPLATE_OPTIONAL: "Opcional del catálogo ICE24",
  ACCOUNT_CUSTOM: "Propio de la cuenta",
};
export const ACTIVITY_TYPE_LABELS: Record<"MAINTENANCE" | "SANITATION", string> = {
  MAINTENANCE: "Mantenimiento",
  SANITATION: "Sanitización",
};

/**
 * Same rule as `sameFrequency` in @ice24/domain (F4-20): weeks are exactly seven days; months
 * only compare with months. The API is authoritative; the UI uses it to warn before sending.
 */
export function sameFrequency(left: FrequencyValue, right: FrequencyValue): boolean {
  const days = (v: FrequencyValue) => (v.unit === "weeks" ? v.value * 7 : v.value);
  if (left.unit === "months" || right.unit === "months")
    return left.unit === right.unit && left.value === right.value;
  return days(left) === days(right);
}

/** RA-01-D1: leaving an ICE24 factory value asks the user to accept the warranty warning. */
export function needsWarrantyWarning(
  warrantyApplies: boolean,
  factory: readonly FrequencyValue[],
  chosen: FrequencyValue,
): boolean {
  return warrantyApplies && factory.some((value) => !sameFrequency(value, chosen));
}

/** What the viewer can do with components and frequencies of one machine (RA-01-D2). */
export type ConfigurationMode =
  /** Owner, or Operator of the machine's branch, in an active account. */
  | "edit"
  /** The role only consults (technician, auditor, Operator of another branch…). */
  | "role-read-only"
  /** The role could edit, but the account is read-only or suspended (F5-03). */
  | "account-read-only";

export function machineConfigurationMode(
  access: EquipmentConfigurationAccess | undefined,
  accessMode: string | undefined,
  branchId: string | undefined,
): ConfigurationMode {
  const branches = access?.machineBranches ?? [];
  const allowed = branches === "ALL" || (!!branchId && branches.includes(branchId));
  if (!allowed) return "role-read-only";
  return accessMode === "ACTIVE" ? "edit" : "account-read-only";
}

export function accountConfigurationMode(
  access: EquipmentConfigurationAccess | undefined,
  accessMode: string | undefined,
): ConfigurationMode | "hidden" {
  const level = access?.accountFrequencies ?? "hidden";
  if (level === "hidden") return "hidden";
  if (level === "read") return "role-read-only";
  return accessMode === "ACTIVE" ? "edit" : "account-read-only";
}

export const READ_ONLY_TEXT: Record<Exclude<ConfigurationMode, "edit">, string> = {
  "role-read-only":
    "Modo consulta: tu rol puede ver los componentes y las frecuencias, pero solo el propietario o el Operador de la sucursal de la máquina pueden cambiarlos.",
  "account-read-only":
    "La cuenta está en modo lectura: puedes consultar, pero no cambiar componentes ni frecuencias hasta regularizar la suscripción.",
};

/** Short date in the viewer's locale for histories ("9 oct 2026"). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "vigente";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

/** Reads a frequency from form fields `<prefix>Value` and `<prefix>Unit`; null when empty. */
export function readFrequency(form: FormData, prefix: string): FrequencyValue | null {
  const raw = String(form.get(`${prefix}Value`) ?? "").trim();
  if (raw === "") return null;
  const value = Number(raw);
  const unit = String(form.get(`${prefix}Unit`) ?? "days") as FrequencyValue["unit"];
  if (!Number.isInteger(value) || value < 1 || !(unit in UNITS))
    throw new RangeError("La frecuencia debe ser un número entero mayor que cero.");
  return { value, unit };
}

/** The factory values recorded on an override (one per template in use). */
export const factoryOf = (override: FrequencyOverride): string =>
  override.factoryFrequencies.map((value) => formatFrequency(value)).join(" / ") || "—";

export const NOTHING_TO_RESET =
  "No hay valores del cliente que restablecer: ya rige el valor de fábrica.";
