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
export const demoExecutionDefinition = {
  ...demoOrderDefinition,
  evidenceRules: {
    required: true,
    minimumFiles: 2,
    requirements: [
      {
        code: "before",
        label: "Foto antes",
        type: "before_photo" as const,
        required: true,
        minimum: 1,
      },
      {
        code: "after",
        label: "Foto después",
        type: "after_photo" as const,
        required: true,
        minimum: 1,
      },
      {
        code: "temperature",
        label: "Temperatura de salida",
        type: "reading" as const,
        required: true,
        minimum: 1,
        unit: "°C",
        minimumValue: 0,
        maximumValue: 5,
      },
      { code: "lot", label: "Lote del filtro", type: "lot" as const, required: true, minimum: 1 },
      {
        code: "signature",
        label: "Nombre de quien confirma",
        type: "signature" as const,
        required: true,
        minimum: 1,
      },
    ],
  },
};
