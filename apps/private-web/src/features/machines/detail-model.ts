import type { MachineDetail, MachineAccess } from "@ice24/contracts";
export {
  machineDetailSchema,
  machineAccessSchema,
  machineBranchSchema,
  machineTransferSchema,
} from "@ice24/contracts";
export type {
  MachineDetail,
  MachineAccess,
  MachineBranch,
  MachineTransfer,
} from "@ice24/contracts";
import { machineConfigurationMode, type ConfigurationMode } from "../equipment/configuration-model";

export function machinePermissions(
  machine: MachineDetail,
  access: MachineAccess,
  permissions: readonly string[],
  canWrite: boolean,
) {
  const active =
    canWrite && access.accessMode === "ACTIVE" && machine.operational_status !== "retired";
  const configuration = machineConfigurationMode(
    access.configuration,
    active ? "ACTIVE" : "READ_ONLY",
    machine.branch_id,
  );
  const panel = (permission: string): ConfigurationMode =>
    permissions.includes(permission) ? configuration : "role-read-only";
  return {
    manage: permissions.includes("equipment.manage") && access.canManage,
    write: active,
    components: panel("equipment.machine-components-manage"),
    frequencies: panel("equipment.machine-frequencies-manage"),
    createOwn: access.configuration?.accountCatalog ?? false,
    report: active && permissions.includes("maintenance.tickets-create"),
    tickets: permissions.includes("maintenance.tickets-read"),
    maintenance: permissions.includes("maintenance.read"),
    audit: permissions.includes("audit.read"),
    assign: active && permissions.includes("maintenance.orders-assign"),
  };
}
export function recordDate(value: string | null | undefined, timezone = "America/Mexico_City") {
  if (!value || Number.isNaN(Date.parse(value))) return "Sin registro";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeZone: value.length === 10 ? "UTC" : timezone,
  }).format(new Date(value));
}
export const PUBLICATION = {
  private: "Privada",
  pending: "Pendiente",
  published: "Publicada",
  withdrawn: "Retirada de publicación",
};
