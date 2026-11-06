import { randomUUID } from "node:crypto";
import {
  executionRevisionSchema,
  workOrderExecutionSchema,
  type WorkOrder,
  type WorkOrderExecution,
} from "@ice24/contracts";
import { assessWorkOrderExecution } from "@ice24/domain";
import { BadRequestException, ConflictException } from "@nestjs/common";
import type { PoolClient } from "pg";

export async function executionHistory(client: PoolClient, accountId: string, orderId: string) {
  const rows = await client.query(
    `select id,version,kind,actor_id as "actorId",reason,execution,to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt" from maintenance.work_order_executions where account_id=$1 and order_id=$2 order by version desc limit 100`,
    [accountId, orderId],
  );
  return rows.rows.map((row) => executionRevisionSchema.parse(row));
}

export async function verifyExecutionFiles(
  client: PoolClient,
  accountId: string,
  order: WorkOrder,
  data: WorkOrderExecution,
  closing: boolean,
) {
  for (const evidence of data.evidence) {
    if (evidence.type !== "photo") continue;
    const row = (
      await client.query<{
        status: string;
        scan_status: string;
        sha256: string | null;
        available_at: Date | null;
        storage_zone: string;
      }>(
        `select distinct status,scan_status,sha256,available_at,storage_zone from files.work_order_evidence_read where account_id=$1 and machine_id=$2 and id=$3 and version_id=$4 and media_type in ('image/jpeg','image/png','image/webp') and size_bytes<=10485760 and (expires_at is null or expires_at>now()) and storage_zone<>'PUBLIC'`,
        [accountId, order.machineId, evidence.fileId, evidence.fileVersionId],
      )
    ).rows[0];
    if (
      !row ||
      !["VERIFYING", "AVAILABLE"].includes(row.status) ||
      ["INFECTED", "FAILED"].includes(row.scan_status)
    )
      throw new BadRequestException("Foto no válida para esta máquina o versión.");
    if (
      closing &&
      (row.status !== "AVAILABLE" ||
        row.scan_status !== "CLEAN" ||
        !row.sha256 ||
        !row.available_at ||
        row.storage_zone !== "PRIVATE_ORIGINAL")
    )
      throw new ConflictException("Una foto sigue en verificación. Espera antes de cerrar.");
  }
}

export async function appendExecution(
  client: PoolClient,
  accountId: string,
  order: WorkOrder,
  actorId: string,
  input: unknown,
  kind: "draft" | "closure" | "correction",
  reason: string,
) {
  const data = workOrderExecutionSchema.parse(input);
  const assessment = assessWorkOrderExecution(order.definition, data);
  if (kind !== "draft" && !assessment.complete)
    throw new ConflictException({
      message: "Faltan requisitos de cierre.",
      missing: assessment.missing,
    });
  await verifyExecutionFiles(client, accountId, order, data, kind !== "draft");
  const id = randomUUID();
  await client.query(
    `insert into maintenance.work_order_executions(id,account_id,order_id,version,kind,actor_id,reason,execution) select $1,$2,$3,coalesce(max(version),0)+1,$4,$5,$6,$7 from maintenance.work_order_executions where order_id=$3`,
    [id, accountId, order.id, kind, actorId, reason, JSON.stringify(data)],
  );
  for (const evidence of data.evidence)
    if (evidence.type === "photo")
      await client.query(
        "insert into maintenance.execution_files(revision_id,file_id,file_version_id) values($1,$2,$3)",
        [id, evidence.fileId, evidence.fileVersionId],
      );
  return { id, data, assessment };
}
