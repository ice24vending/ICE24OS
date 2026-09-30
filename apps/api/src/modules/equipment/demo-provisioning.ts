import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { branchInputSchema, equipmentRequestInputSchema } from "@ice24/contracts";

// Versioned synthetic master for the modules available in F5-01. Later operational
// modules add their own fixtures; no production tenant is ever used as a template.
export const DEMO_TEMPLATE_VERSION = "equipment-v1";
export async function provisionDemoEquipment(
  client: PoolClient,
  accountId: string,
  now: string,
): Promise<void> {
  for (let branchIndex = 0; branchIndex < 2; branchIndex++) {
    const branchId = randomUUID();
    const data = branchInputSchema.parse({
      name: `Datos ficticios · Sucursal ${branchIndex + 1}`,
      address: "Dirección ficticia de demostración",
      latitude: 19.4,
      longitude: -99.1,
      timezone: "America/Mexico_City",
      schedule: "09:00–17:00",
      publicPhone: "",
      ownerPhonePublic: false,
      referenceTemperature: null,
    });
    await client.query(
      "insert into equipment.branches(id,account_id,data,created_at) values($1,$2,$3,$4::timestamptz-interval '2 months')",
      [branchId, accountId, JSON.stringify(data), now],
    );
    for (let month = 2; month >= 0; month--) {
      const input = equipmentRequestInputSchema.parse({
        branchId,
        modelName: `Datos ficticios · Solicitud ${branchIndex + 1}-${month}`,
        serialNumber: `DEMO-${branchIndex + 1}-${month}`,
      });
      await client.query(
        `insert into equipment.requests(account_id,branch_id,folio,data,created_at)
        values($1,$2,equipment.next_folio($1,'EQP'),$3,$4::timestamptz-make_interval(months=>$5))`,
        [accountId, branchId, JSON.stringify(input), now, month],
      );
    }
  }
}
