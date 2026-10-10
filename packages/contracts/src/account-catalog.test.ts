import { describe, expect, it } from "vitest";
import {
  accountCatalogEntrySchema,
  accountCatalogQuerySchema,
  createAccountCatalogEntrySchema,
  maintenanceFrequencySchema,
  retireAccountCatalogEntrySchema,
  updateAccountCatalogEntrySchema,
} from "./equipment.js";

const activity = {
  code: "UV_CLEAN",
  name: "Limpieza de lámpara UV",
  category: "maintenance",
  defaultFrequency: { value: 3, unit: "months" },
  checklist: [{ code: "LAMP", label: "Limpiar la lámpara", required: true }],
  evidenceRules: { required: true, minimumFiles: 1 },
};
const component = { code: "UV-LAMP", kind: "component", name: "Lámpara UV propia" };

describe("TASK-F4-18 account catalog contracts", () => {
  it("accepts components with an optional maintenance activity", () => {
    expect(createAccountCatalogEntrySchema.safeParse(component).success).toBe(true);
    expect(
      createAccountCatalogEntrySchema.safeParse({ ...component, maintenanceActivity: activity })
        .success,
    ).toBe(true);
  });
  it("rejects scope, ownership and status smuggling in inputs", () => {
    for (const field of ["scope", "accountId", "status", "account_id"])
      expect(
        createAccountCatalogEntrySchema.safeParse({ ...component, [field]: "ACCOUNT" }).success,
      ).toBe(false);
    expect(updateAccountCatalogEntrySchema.safeParse({ name: "X", code: "OTHER" }).success).toBe(
      false,
    );
    expect(
      updateAccountCatalogEntrySchema.safeParse({ name: "X", kind: "component" }).success,
    ).toBe(false);
  });
  it("only allows account kinds and restricts activities to components", () => {
    expect(
      createAccountCatalogEntrySchema.safeParse({ ...component, kind: "manufacturer" }).success,
    ).toBe(false);
    expect(
      createAccountCatalogEntrySchema.safeParse({
        ...component,
        kind: "characteristic",
        maintenanceActivity: activity,
      }).success,
    ).toBe(false);
    expect(createAccountCatalogEntrySchema.safeParse({ ...component, code: "lower" }).success).toBe(
      false,
    );
  });
  it("validates frequency units, limits and evidence minimums", () => {
    expect(maintenanceFrequencySchema.safeParse({ value: 3650, unit: "days" }).success).toBe(true);
    expect(maintenanceFrequencySchema.safeParse({ value: 121, unit: "months" }).success).toBe(
      false,
    );
    expect(maintenanceFrequencySchema.safeParse({ value: 0, unit: "days" }).success).toBe(false);
    expect(maintenanceFrequencySchema.safeParse({ value: 1.5, unit: "weeks" }).success).toBe(false);
    expect(maintenanceFrequencySchema.safeParse({ value: 2, unit: "years" }).success).toBe(false);
    expect(
      createAccountCatalogEntrySchema.safeParse({
        ...component,
        maintenanceActivity: { ...activity, evidenceRules: { required: true, minimumFiles: 0 } },
      }).success,
    ).toBe(false);
    expect(
      createAccountCatalogEntrySchema.safeParse({
        ...component,
        maintenanceActivity: { ...activity, checklist: [] },
      }).success,
    ).toBe(false);
  });
  it("requires an explicit reason and confirmation to retire", () => {
    expect(
      retireAccountCatalogEntrySchema.safeParse({ reason: "Ya no se utiliza", confirmation: true })
        .success,
    ).toBe(true);
    expect(
      retireAccountCatalogEntrySchema.safeParse({ reason: "corto", confirmation: true }).success,
    ).toBe(false);
    expect(
      retireAccountCatalogEntrySchema.safeParse({ reason: "Ya no se utiliza", confirmation: false })
        .success,
    ).toBe(false);
  });
  it("bounds list queries to enumerated filters", () => {
    expect(accountCatalogQuerySchema.parse({ limit: "10", status: "active" })).toMatchObject({
      limit: 10,
      status: "active",
    });
    expect(accountCatalogQuerySchema.safeParse({ accountId: "x" }).success).toBe(false);
    expect(accountCatalogQuerySchema.safeParse({ limit: "500" }).success).toBe(false);
  });
  it("describes the response DTO without database columns", () => {
    const entry = {
      id: "0192e8e8-45ad-7b12-8d90-73db122e70e1",
      scope: "ACCOUNT",
      kind: "component",
      code: "UV-LAMP",
      name: "Lámpara UV propia",
      description: null,
      unit: null,
      maintenanceActivity: activity,
      status: "active",
      version: 1,
      createdAt: "2026-10-09T12:00:00.000Z",
      updatedAt: "2026-10-09T12:00:00.000Z",
    };
    expect(accountCatalogEntrySchema.safeParse(entry).success).toBe(true);
    expect(accountCatalogEntrySchema.safeParse({ ...entry, row_version: 1 }).success).toBe(false);
    expect(accountCatalogEntrySchema.safeParse({ ...entry, scope: "OFFICIAL" }).success).toBe(
      false,
    );
  });
});
