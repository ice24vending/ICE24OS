import { randomBytes } from "node:crypto";
import {
  approvalInputSchema,
  equipmentRequestInputSchema,
  transitionInputSchema,
} from "@ice24/contracts";
import { machineCode } from "@ice24/domain";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type { SecurityRequest } from "../../common/security/security-request.js";
import {
  EquipmentDatabase,
  audit,
  branch,
  expected,
  one,
  scope,
  versionHeader,
  type RecordRow,
} from "./equipment.database.js";

export async function cleanFiles(
  client: PoolClient,
  accountId: string,
  ids: string[],
): Promise<void> {
  const files = await client.query(
    "select id from equipment.files where id=any($1::uuid[]) and account_id=$2 and status='clean' for share",
    [ids, accountId],
  );
  if (files.rowCount !== ids.length)
    throw new ConflictException("Evidence must belong to the account and pass the malware scan");
}
@Injectable()
export class RequestsStore {
  constructor(@Inject(EquipmentDatabase) private readonly db: EquipmentDatabase) {}
  list(request: SecurityRequest, admin = false) {
    return this.db.run(
      request,
      "requests",
      null,
      false,
      async (client, op) =>
        (
          await client.query(
            `select * from equipment.requests
      where $1 or (account_id=$2 and ($3 or branch_id=any($4::uuid[]))) order by created_at desc,id limit 200`,
            [admin && op.admin, op.accountId, op.subject.accountWide, [...op.subject.branchIds]],
          )
        ).rows,
      admin,
    );
  }
  save(request: SecurityRequest, body: unknown, id?: string) {
    const input = equipmentRequestInputSchema.parse(body);
    return this.db.run(request, `request:${id ?? "create"}`, input, true, async (client, op) => {
      let before;
      if (id) {
        before = await one(client, "select * from equipment.requests where id=$1 for update", [id]);
        scope(op, { ...before, id: before.branch_id }, "branch");
        expected(before, versionHeader(request));
        if (!["draft", "information_required"].includes(before.status))
          throw new ConflictException("Only drafts and information requests are editable");
      }
      await branch(client, op, input.branchId);
      await cleanFiles(client, op.accountId, input.fileIds);
      if (input.manufacturerId)
        await one(
          client,
          "select * from equipment.catalog_entries where id=$1 and kind='manufacturer' and status='active'",
          [input.manufacturerId],
        );
      const row = id
        ? await one(
            client,
            "update equipment.requests set branch_id=$2,data=$3,row_version=row_version+1,updated_at=now() where id=$1 returning *",
            [id, input.branchId, JSON.stringify(input)],
          )
        : await one(
            client,
            "insert into equipment.requests(account_id,branch_id,folio,data) values($1,$2,equipment.next_folio($1,'EQP'),$3) returning *",
            [op.accountId, input.branchId, JSON.stringify(input)],
          );
      await audit(
        client,
        op,
        row,
        "EQUIPMENT_REQUEST_SAVED",
        "Equipment onboarding draft saved",
        before,
      );
      return row;
    });
  }
  detail(request: SecurityRequest, id: string) {
    return this.db.run(request, `request:${id}`, null, false, async (client, op) => {
      const row = await one(client, "select * from equipment.requests where id=$1", [id]);
      scope(op, { ...row, id: row.branch_id }, "branch");
      return row;
    });
  }
  transition(
    request: SecurityRequest,
    id: string,
    body: unknown,
    action: "submit" | "review" | "request-information" | "reject" | "approve",
  ) {
    const input =
      action === "approve" ? approvalInputSchema.parse(body) : transitionInputSchema.parse(body);
    return this.db.run(
      request,
      `request:${id}:${action}`,
      input,
      true,
      async (client, op) => {
        const before = await one(
          client,
          "select * from equipment.requests where id=$1 for update",
          [id],
        );
        scope(op, { ...before, id: before.branch_id }, "branch", action !== "submit");
        expected(before, versionHeader(request));
        const allowed =
          action === "submit"
            ? ["draft", "information_required"]
            : action === "review"
              ? ["submitted"]
              : ["submitted", "in_review"];
        if (!allowed.includes(before.status))
          throw new ConflictException("Invalid review transition");
        const details = equipmentRequestInputSchema.parse(before.data);
        if (action === "submit" || action === "approve") {
          if (
            !details.manufacturerId ||
            !details.modelName.trim() ||
            !details.serialNumber.trim() ||
            !details.capacity ||
            details.fileIds.length === 0
          )
            throw new ConflictException(
              "Manufacturer, model, serial number, capacity and evidence are required",
            );
          await cleanFiles(client, before.account_id, details.fileIds);
          await branch(client, op, before.branch_id, action === "approve");
        }
        let machine: RecordRow | undefined;
        if ("templateVersionId" in input) {
          const template = await one(
            client,
            "select * from equipment.template_versions where id=$1 and model_id=$2 and status='published' for share",
            [input.templateVersionId, input.technicalModelId],
          );
          const model = await one(
            client,
            "select * from equipment.technical_models where id=$1 and status='active' for share",
            [template.model_id],
          );
          if (model.manufacturer_id !== details.manufacturerId)
            throw new ConflictException("Manufacturer and technical model do not match");
          if (input.validatedFileIds.some((id) => !details.fileIds.includes(id)))
            throw new ConflictException("Review evidence must be attached to the request");
          await cleanFiles(client, before.account_id, input.validatedFileIds);
          // Retry only the random identifier collision; request uniqueness is still enforced.
          for (let attempt = 0; attempt < 5; attempt++) {
            const rows = await client.query<RecordRow>(
              `insert into equipment.machines(machine_code,request_id,account_id,branch_id,model_id,template_id,data,operational_status)
            values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(machine_code) do nothing returning *`,
              [
                machineCode(randomBytes(10)),
                id,
                before.account_id,
                before.branch_id,
                template.model_id,
                template.id,
                JSON.stringify({
                  ...details,
                  internalName: details.modelName,
                  commercialBrand: "",
                }),
                input.initialOperationalStatus,
              ],
            );
            machine = rows.rows[0];
            if (machine) break;
          }
          if (!machine) throw new ConflictException("Could not allocate machine code; retry");
          for (const [kind, reference] of [
            ["ownership", machine.account_id],
            ["location", machine.branch_id],
            ["template", machine.template_id],
          ]) {
            await client.query(
              "insert into equipment.machine_periods(machine_id,kind,reference_id,valid_from,actor_id,reason) values($1,$2,$3,now(),$4,$5)",
              [machine.id, kind, reference, op.userId, input.reviewNotes],
            );
          }
          await client.query(
            "insert into equipment.schedule_jobs(machine_id,template_id) values($1,$2)",
            [machine.id, machine.template_id],
          );
          await audit(client, op, machine, "MACHINE_ACTIVATED", input.reviewNotes);
        }
        const status = {
          submit: "submitted",
          review: "in_review",
          "request-information": "information_required",
          reject: "rejected",
          approve: "active",
        }[action];
        const row = await one(
          client,
          "update equipment.requests set status=$2,review=$3,row_version=row_version+1,updated_at=now() where id=$1 returning *",
          [id, status, JSON.stringify(input)],
        );
        await audit(
          client,
          op,
          row,
          `EQUIPMENT_REQUEST_${status.toUpperCase()}`,
          "reviewNotes" in input ? input.reviewNotes : input.reason,
          before,
        );
        return { ...row, ...(machine ? { machine } : {}) };
      },
      action !== "submit",
    );
  }
}
