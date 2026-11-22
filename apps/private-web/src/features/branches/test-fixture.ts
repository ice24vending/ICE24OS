import type { BranchOverview } from "@ice24/contracts";
export const branch: BranchOverview = {
  id: "b0000000-0000-4000-8000-000000000001",
  account_id: "a",
  row_version: 3,
  status: "active",
  responsible: "Jorge Salinas",
  machineCounts: { available: 3, out_of_service: 1 },
  data: {
    name: "Centro Monterrey",
    code: "CENTRO",
    city: "Monterrey",
    state: "Nuevo León",
    notes: "Acceso lateral",
    address: "Juárez 1200",
    latitude: 25.68,
    longitude: -100.31,
    timezone: "America/Mexico_City",
    schedule: "08:00 a 18:00",
    publicPhone: "81 5550 1200",
    ownerPhonePublic: false,
    referenceTemperature: -8,
  },
};
