export const demoOrderDefinition = {
  code: "MNT-1",
  name: "Revisar filtro de agua",
  category: "maintenance" as const,
  triggerType: "time" as const,
  frequencyDays: 30,
  triggerDescription: "",
  responsibleRole: "TC",
  checklist: [
    { code: "ISOLATE", label: "Desconectar la alimentación", required: true },
    { code: "FILTER", label: "Inspeccionar el filtro y registrar su condición", required: true },
  ],
  fields: [],
  evidenceRules: { required: true, minimumFiles: 2 },
  escalationRules: { afterHours: 24, notifyRole: "OW" },
  criticality: "high" as const,
  procedure:
    "Aislar el equipo, verificar ausencia de energía y revisar el filtro siguiendo el procedimiento técnico de esta versión.",
  plannedParts: [{ code: "FILTER", name: "Filtro de agua", quantity: 1, unit: "pieza" }],
};
