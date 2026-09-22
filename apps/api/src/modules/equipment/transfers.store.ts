import { transferInputSchema, transitionInputSchema } from "@ice24/contracts";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { SecurityRequest } from "../../common/security/security-request.js";
import {
  EquipmentDatabase,
  audit,
  expected,
  one,
  scope,
  versionHeader,
  type RecordRow,
} from "./equipment.database.js";
import { changePeriod } from "./machines.store.js";
import { cleanFiles } from "./requests.store.js";

@Injectable()
export class TransfersStore {
  constructor(@Inject(EquipmentDatabase) private readonly db: EquipmentDatabase) {}
  create(request: SecurityRequest, body: unknown) {
    const input = transferInputSchema.parse(body);
    return this.db.run(request, "transfer:create", input, true, async (client, op) => {
      const machine = await one(client, "select * from equipment.machines where id=$1 for update", [
        input.machineId,
      ]);
      scope(op, machine, "machine");
      expected(machine, versionHeader(request));
      if (machine.account_id === input.toAccountId || machine.operational_status === "retired")
        throw new ConflictException("Invalid transfer destination or machine state");
      // A transfer draft does not grant access to destination account information.
      const target = await client.query(
        "select b.id from equipment.branches b join identity.accounts a on a.id=b.account_id where b.id=$1 and b.account_id=$2 and b.status='active' and a.access_mode='ACTIVE' and a.archived_at is null",
        [input.toBranchId, input.toAccountId],
      );
      if (!target.rowCount) throw new ConflictException("Destination cannot receive this transfer");
      await cleanFiles(client, op.accountId, input.authorizationFileIds);
      if (
        Object.values(input.commercialDataTransfer).some(Boolean) &&
        input.authorizationFileIds.length === 0
      )
        throw new ConflictException(
          "Commercial transfer requires explicit documentary authorization",
        );
      const row = await one(
        client,
        `insert into equipment.transfers(machine_id,account_id,to_account_id,to_branch_id,folio,data,machine_version)
        values($1,$2,$3,$4,equipment.next_folio($2,'TRF'),$5,$6) returning *`,
        [
          machine.id,
          op.accountId,
          input.toAccountId,
          input.toBranchId,
          JSON.stringify(input),
          machine.row_version,
        ],
      );
      await audit(client, op, row, "TRANSFER_REQUESTED", input.reason);
      return row;
    });
  }
  detail(request: SecurityRequest, id?: string, admin = false) {
    return this.db.run(
      request,
      `transfers:${id ?? "list"}`,
      null,
      false,
      async (client, op) => {
        if (!id) {
          if (!admin) scope(op, { account_id: op.accountId } as RecordRow, "account");
          return (
            await client.query(
              "select * from equipment.transfers where $1 or account_id=$2 order by created_at desc limit 200",
              [admin && op.admin, op.accountId],
            )
          ).rows;
        }
        const row = await one(client, "select * from equipment.transfers where id=$1", [id]);
        scope(op, row, "account", admin);
        return row;
      },
      admin,
    );
  }
  transition(
    request: SecurityRequest,
    id: string,
    body: unknown,
    action: "approve" | "execute" | "reject" | "cancel",
  ) {
    const input = transitionInputSchema.parse(body);
    return this.db.run(
      request,
      `transfer:${id}:${action}`,
      input,
      true,
      async (client, op) => {
        // Serialize on the machine first, matching moves, retirement and the schedule worker.
        const reference = await one(client, "select * from equipment.transfers where id=$1", [id]);
        const machine = await one(
          client,
          "select * from equipment.machines where id=$1 for update",
          [reference.machine_id],
        );
        const before = await one(
          client,
          "select * from equipment.transfers where id=$1 for update",
          [id],
        );
        scope(op, before, "account", action !== "cancel");
        expected(before, versionHeader(request));
        if (
          action === "execute"
            ? before.status !== "approved"
            : !["pending", "approved"].includes(before.status)
        )
          throw new ConflictException("Invalid transfer transition");
        if (action === "approve" && before.status !== "pending")
          throw new ConflictException("Transfer already approved");
        if (["approve", "execute"].includes(action)) {
          if (
            machine.account_id !== before.account_id ||
            machine.row_version !== before.machine_version ||
            machine.operational_status === "retired"
          )
            throw new ConflictException("Machine changed; cancel and recreate the transfer");
          await one(
            client,
            `select b.* from equipment.branches b join identity.accounts a on a.id=b.account_id
          where b.id=$1 and b.account_id=$2 and b.status='active' and a.access_mode='ACTIVE' and a.archived_at is null for share of b,a`,
            [before.to_branch_id, before.to_account_id],
          );
          const terms = transferInputSchema.parse(before.data);
          await cleanFiles(client, before.account_id, terms.authorizationFileIds);
        }
        if (action === "execute") {
          const time = (
            await client.query<{ time: string }>("select clock_timestamp()::text as time")
          ).rows[0]!.time;
          await changePeriod(
            client,
            op,
            machine.id,
            "ownership",
            before.to_account_id,
            input.reason,
            time,
          );
          await changePeriod(
            client,
            op,
            machine.id,
            "location",
            before.to_branch_id,
            input.reason,
            time,
          );
          const changed = await one(
            client,
            `update equipment.machines set account_id=$2,branch_id=$3,
          data=data - 'fileIds',publication_status='private',row_version=row_version+1,updated_at=now() where id=$1 returning *`,
            [machine.id, before.to_account_id, before.to_branch_id],
          );
          // A scope tied to the former account must never survive a transfer.
          await client.query(
            "update authz.user_scopes set valid_to=clock_timestamp() where machine_id=$1 and valid_to is null",
            [machine.id],
          );
          await audit(client, op, changed, "MACHINE_TRANSFERRED", input.reason, {
            machineCode: machine.machine_code,
          });
        }
        const state = {
          approve: "approved",
          execute: "executed",
          reject: "rejected",
          cancel: "cancelled",
        }[action];
        const row = await one(
          client,
          "update equipment.transfers set status=$2,executed_at=case when $2='executed' then now() else executed_at end,row_version=row_version+1 where id=$1 returning *",
          [id, state],
        );
        await audit(client, op, row, `TRANSFER_${state.toUpperCase()}`, input.reason, before);
        return row;
      },
      action !== "cancel",
    );
  }
}
