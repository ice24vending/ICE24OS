import { describe, expect, it } from "vitest";
import { assessWorkOrderExecution } from "./work-order-execution.js";
const definition = {
  checklist: [{ code: "SAFE", label: "Aislar", required: true }],
  fields: [{ code: "hours", label: "Horas", type: "number", required: true }],
  evidenceRules: {
    required: true,
    minimumFiles: 1,
    requirements: [
      { code: "before", label: "Foto antes", type: "before_photo", required: true, minimum: 1 },
      {
        code: "temperature",
        label: "Temperatura",
        type: "reading",
        required: true,
        minimum: 1,
        unit: "°C",
        minimumValue: 0,
        maximumValue: 5,
      },
      { code: "lot", label: "Lote", type: "lot", required: true, minimum: 1 },
      { code: "signature", label: "Firma", type: "signature", required: true, minimum: 1 },
    ],
  },
};
const execution = {
  checklist: ["SAFE"],
  fields: { hours: 3 },
  diagnosis: "Filtro sucio",
  activitiesPerformed: "Cambio de filtro",
  tests: "Caudal verificado",
  recommendation: "Revisar en 30 días",
  result: "conforming",
  followup: "",
  evidence: [
    { type: "photo", requirementCode: "before", fileId: "photo", fileVersionId: "version" },
    { type: "reading", requirementCode: "temperature", value: 2, unit: "°C" },
    { type: "lot", requirementCode: "lot", value: "A1" },
    { type: "signature", requirementCode: "signature", name: "Ana Torres", confirmed: true },
  ],
};
describe("execution requirements frozen on the order", () => {
  it("accepts a complete execution", () =>
    expect(assessWorkOrderExecution(definition, execution).complete).toBe(true));
  it.each(["diagnosis", "activitiesPerformed", "tests", "recommendation"])(
    "blocks missing %s",
    (key) =>
      expect(assessWorkOrderExecution(definition, { ...execution, [key]: "" }).complete).toBe(
        false,
      ),
  );
  it.each(["before", "temperature", "lot", "signature"])("blocks missing evidence %s", (code) =>
    expect(
      assessWorkOrderExecution(definition, {
        ...execution,
        evidence: execution.evidence.filter((e) => e.requirementCode !== code),
      }).complete,
    ).toBe(false),
  );
  it("blocks wrong units, missing steps, duplicate photos and unknown fields", () => {
    expect(assessWorkOrderExecution(definition, { ...execution, checklist: [] }).complete).toBe(
      false,
    );
    expect(
      assessWorkOrderExecution(definition, {
        ...execution,
        fields: { ...execution.fields, injected: true },
      }).complete,
    ).toBe(false);
    expect(
      assessWorkOrderExecution(definition, {
        ...execution,
        evidence: [...execution.evidence, execution.evidence[0]!],
      }).complete,
    ).toBe(false);
    expect(
      assessWorkOrderExecution(definition, {
        ...execution,
        evidence: execution.evidence.map((e) => (e.type === "reading" ? { ...e, unit: "F" } : e)),
      }).complete,
    ).toBe(false);
  });
  it("keeps outliers and requires a nonconforming result with follow-up", () => {
    const outlier = {
      ...execution,
      evidence: execution.evidence.map((e) => (e.type === "reading" ? { ...e, value: 20 } : e)),
    };
    expect(assessWorkOrderExecution(definition, outlier).outOfRange).toEqual(["temperature"]);
    expect(
      assessWorkOrderExecution(definition, { ...outlier, result: "nonconforming" }).complete,
    ).toBe(false);
    expect(
      assessWorkOrderExecution(definition, {
        ...outlier,
        result: "nonconforming",
        followup: "Reemplazar termostato y repetir prueba.",
      }).complete,
    ).toBe(true);
  });
});
