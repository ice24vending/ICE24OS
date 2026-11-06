interface Requirement {
  code: string;
  label: string;
  type: string;
  required: boolean;
  minimum: number;
  unit?: string | undefined;
  minimumValue?: number | undefined;
  maximumValue?: number | undefined;
}
interface Definition {
  checklist: readonly { code: string; label: string; required: boolean }[];
  fields?: readonly { code: string; label: string; type: string; required: boolean }[] | undefined;
  evidenceRules: {
    required: boolean;
    minimumFiles: number;
    requirements?: readonly Requirement[] | undefined;
  };
}
interface Evidence {
  type: string;
  requirementCode: string;
  fileId?: string | undefined;
  fileVersionId?: string | undefined;
  value?: string | number | undefined;
  unit?: string | undefined;
  name?: string | undefined;
  confirmed?: boolean | undefined;
}
interface Execution {
  checklist: readonly string[];
  fields: Record<string, string | number | boolean>;
  diagnosis: string;
  activitiesPerformed: string;
  tests: string;
  recommendation: string;
  evidence: readonly Evidence[];
  result: string;
  followup: string;
}

/** Completeness derives only from the frozen definition and captured values. File trust is checked by the server. */
export function assessWorkOrderExecution(definition: Definition, execution: Execution) {
  const missing: { field: string; message: string }[] = [];
  const outOfRange: string[] = [];
  const add = (field: string, message: string) => missing.push({ field, message });
  for (const item of definition.checklist)
    if (item.required && !execution.checklist.includes(item.code))
      add(`checklist-${item.code}`, `Completa: ${item.label}.`);
  for (const key of execution.checklist)
    if (!definition.checklist.some((x) => x.code === key))
      add("checklist", "Hay pasos que no pertenecen a la orden.");
  for (const [field, label] of [
    ["diagnosis", "diagnóstico"],
    ["activitiesPerformed", "actividades realizadas"],
    ["tests", "pruebas"],
    ["recommendation", "recomendación"],
  ] as const)
    if (!execution[field].trim()) add(field, `Completa ${label}.`);
  for (const field of definition.fields ?? []) {
    const value = execution.fields[field.code];
    if ((value === undefined || value === "") && !field.required) continue;
    const valid =
      field.type === "number"
        ? typeof value === "number" && Number.isFinite(value)
        : field.type === "boolean"
          ? typeof value === "boolean"
          : typeof value === "string" &&
            value.trim().length > 0 &&
            (field.type !== "date" ||
              (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
                Number.isFinite(Date.parse(value)) &&
                new Date(value).toISOString().slice(0, 10) === value));
    if (!valid) add(`field-${field.code}`, `Completa ${field.label} con un valor válido.`);
  }
  for (const key of Object.keys(execution.fields))
    if (!(definition.fields ?? []).some((f) => f.code === key))
      add(`field-${key}`, "Campo ajeno a la definición congelada.");
  const requirements = definition.evidenceRules.requirements ?? [];
  const photoIds = execution.evidence.filter((e) => e.type === "photo").map((e) => e.fileId);
  if (new Set(photoIds).size !== photoIds.length)
    add("evidence", "No reutilices la misma foto para acreditar varias evidencias.");
  if (definition.evidenceRules.required && photoIds.length < definition.evidenceRules.minimumFiles)
    add(
      "evidence",
      `Adjunta al menos ${definition.evidenceRules.minimumFiles} archivos verificados.`,
    );
  for (const evidence of execution.evidence)
    if (
      !requirements.some((r) => r.code === evidence.requirementCode) &&
      !(
        requirements.length === 0 &&
        evidence.type === "photo" &&
        evidence.requirementCode === "legacy"
      )
    )
      add("evidence", "La evidencia no pertenece a un requisito de la orden.");
  for (const requirement of requirements) {
    const entries = execution.evidence.filter((e) => e.requirementCode === requirement.code);
    const type = requirement.type.endsWith("_photo") ? "photo" : requirement.type;
    if (entries.some((e) => e.type !== type))
      add(`evidence-${requirement.code}`, `Tipo incorrecto: ${requirement.label}.`);
    const valid = entries.filter(
      (e) => e.type === type && (type !== "reading" || e.unit === requirement.unit),
    );
    if (requirement.required && valid.length < requirement.minimum)
      add(
        `evidence-${requirement.code}`,
        `Falta ${requirement.label} (${valid.length}/${requirement.minimum}).`,
      );
    for (const e of entries)
      if (e.type === "reading") {
        if (e.unit !== requirement.unit)
          add(`evidence-${requirement.code}`, `Usa la unidad ${requirement.unit}.`);
        if (
          typeof e.value === "number" &&
          ((requirement.minimumValue !== undefined && e.value < requirement.minimumValue) ||
            (requirement.maximumValue !== undefined && e.value > requirement.maximumValue))
        )
          outOfRange.push(requirement.code);
      }
  }
  if (outOfRange.length && execution.result !== "nonconforming")
    add("result", "Hay lecturas fuera de rango: conserva el valor real y selecciona No conforme.");
  if (execution.result !== "conforming" && execution.followup.trim().length < 5)
    add("followup", "Registra el seguimiento del resultado.");
  return { missing, outOfRange, complete: missing.length === 0 };
}
