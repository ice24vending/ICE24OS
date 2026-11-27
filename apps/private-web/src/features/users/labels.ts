import type { StatusTone } from "@ice24/ui";

/** Role names as the demo personas show them (UXD-09); one source for every screen. */
export const ROLE_NAMES: Readonly<Record<string, string>> = {
  OW: "Dueño",
  OP: "Administrador de sucursal",
  TC: "Técnico",
  SA: "Responsable sanitario",
  AU: "Solo lectura",
  IA: "Administrador de ICE24",
  IO: "Operador de ICE24",
  DV: "Repartidor",
  RA: "Administrador de restaurante",
};
export const roleName = (code: string) => ROLE_NAMES[code] ?? "Integrante de la cuenta";

/** Roles an account can invite or assign (accountInvitationSchema), with what each one does. */
export const ASSIGNABLE_ROLES = [
  {
    value: "OW",
    description:
      "Administra toda la cuenta: usuarios, sucursales, máquinas, suscripción y auditoría.",
  },
  {
    value: "OP",
    description:
      "Asigna y revisa órdenes y atiende tickets; ajusta componentes y frecuencias de su alcance.",
  },
  {
    value: "TC",
    description: "Ejecuta las órdenes que le asignan, crea tickets y sube evidencias.",
  },
  {
    value: "SA",
    description: "Da seguimiento a las actividades sanitarias de su alcance.",
  },
  {
    value: "AU",
    description: "Consulta la cuenta y su auditoría; no modifica nada.",
  },
].map((role) => ({ ...role, label: roleName(role.value) }));

export const MEMBER_STATUS: Readonly<Record<string, readonly [StatusTone, string]>> = {
  ACTIVE: ["success", "Activo"],
  PENDING: ["info", "Invitado"],
  SUSPENDED: ["warning", "Suspendido"],
  ENDED: ["nodata", "Asociación finalizada"],
};

export type MemberScope = "ACCOUNT" | "BRANCH" | "MACHINE";
export const SCOPE_NAMES: Readonly<Record<MemberScope, string>> = {
  ACCOUNT: "Cuenta completa",
  BRANCH: "Sucursales",
  MACHINE: "Máquinas",
};
