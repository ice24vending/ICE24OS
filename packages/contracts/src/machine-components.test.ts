import { describe, expect, it } from "vitest";
import {
  addMachineComponentSchema,
  machineComponentConfigSchema,
  machineComponentTransitionSchema,
  updateMachineComponentSchema,
} from "./equipment.js";

const componentCatalogId = "0192e8e8-45ad-7b12-8d90-73db122e70e1";
const reason = "Componente instalado en la máquina";

describe("TASK-F4-19 machine component contracts", () => {
  it("validates installation facts, chronology and explicit confirmation", () => {
    const input = {
      model: "Filtro 20",
      installedOn: "2026-10-01",
      warrantyUntil: "2027-10-01",
      reason,
      confirmation: true,
    };
    expect(updateMachineComponentSchema.safeParse(input).success).toBe(true);
    expect(
      updateMachineComponentSchema.safeParse({ ...input, warrantyUntil: "2025-10-01" }).success,
    ).toBe(false);
    expect(
      updateMachineComponentSchema.safeParse({ ...input, installedOn: "2026-02-30" }).success,
    ).toBe(false);
    expect(updateMachineComponentSchema.safeParse({ ...input, confirmation: false }).success).toBe(
      false,
    );
    expect(
      updateMachineComponentSchema.safeParse({ ...input, machineId: componentCatalogId }).success,
    ).toBe(false);
    expect(
      updateMachineComponentSchema.safeParse({
        ...input,
        model: null,
        installedOn: null,
        warrantyUntil: null,
      }).success,
    ).toBe(true);
  });
  it("adds a component with reason and explicit confirmation only", () => {
    expect(
      addMachineComponentSchema.safeParse({ componentCatalogId, reason, confirmation: true })
        .success,
    ).toBe(true);
    expect(
      addMachineComponentSchema.safeParse({ componentCatalogId, reason, confirmation: false })
        .success,
    ).toBe(false);
    expect(
      addMachineComponentSchema.safeParse({ componentCatalogId: "x", reason, confirmation: true })
        .success,
    ).toBe(false);
  });
  it("never accepts origin, status, machine or version from the client", () => {
    for (const field of ["origin", "status", "machineId", "version", "accountId"])
      expect(
        addMachineComponentSchema.safeParse({
          componentCatalogId,
          reason,
          confirmation: true,
          [field]: "ACCOUNT_CUSTOM",
        }).success,
      ).toBe(false);
    expect(
      machineComponentTransitionSchema.safeParse({ reason, confirmation: true, status: "active" })
        .success,
    ).toBe(false);
    expect(
      machineComponentTransitionSchema.safeParse({ reason: "corto", confirmation: true }).success,
    ).toBe(false);
  });
  it("allows redacted history entries for components of another account", () => {
    const entry = {
      id: componentCatalogId,
      machineId: componentCatalogId,
      componentCatalogId,
      component: null,
      origin: "ACCOUNT_CUSTOM",
      status: "active",
      validFrom: "2026-10-10T12:00:00.000Z",
      validTo: "2026-10-11T12:00:00.000Z",
      actorId: null,
      reason: null,
      version: 1,
    };
    expect(machineComponentConfigSchema.safeParse(entry).success).toBe(true);
    expect(machineComponentConfigSchema.safeParse({ ...entry, origin: "MANUAL" }).success).toBe(
      false,
    );
    expect(machineComponentConfigSchema.safeParse({ ...entry, row_version: 1 }).success).toBe(
      false,
    );
  });
});
