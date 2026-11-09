import { createHash, randomUUID } from "node:crypto";
import { authorize, type AuthorizationSubject } from "@ice24/authorization";
import {
  activityInputSchema,
  workOrderDefinitionSchema,
  workOrderSchema,
  workOrderCreateSchema,
  workOrderAssignmentSchema,
  workOrderTransitionSchema,
  workOrderOptionsSchema,
  workOrderQuerySchema,
  workOrderPageSchema,
  workOrderDetailSchema,
  ticketIdSchema,
  type WorkOrder,
  workOrderExecutionSchema,
  workOrderExecutionDetailSchema,
  workOrderReviewSchema,
  offlinePurgeReportSchema,
  conflictFields,
  conflictResolutionSchema,
  synchronizationConflictSchema,
  conflictExecution,
  type OfflineSyncOperation,
  type SynchronizationConflict,
  offlineDownloadSchema,
  offlineReleaseSchema,
  offlineOrderPackageSchema,
  offlineSyncOperationSchema,
} from "@ice24/contracts";
import {
  evaluateWorkOrderTransition,
  workOrderTransitions,
  type WorkOrderAction,
  type WorkOrderFacts,
  assessWorkOrderExecution,
} from "@ice24/domain";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  type OnModuleDestroy,
} from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { getHeader, type SecurityRequest } from "../../../common/security/security-request.js";
import { AccountReadOnlyException } from "../../../common/authorization/account-write.guard.js";
import { IdentityStore } from "../../identity/identity.store.js";
import { appendExecution, executionHistory, verifyExecutionFiles } from "./execution-records.js";

type Tx = {
  client: PoolClient;
  subject: AuthorizationSubject;
  userId: string;
  contextId: string;
  correlationId: string;
};
type Operation = "read" | "assign" | "execute" | "review";
const scope = (s: AuthorizationSubject) => [
  s.membershipAccountId,
  s.accountWide,
  [...s.branchIds],
  [...s.machineIds],
];
const scoped =
  "w.account_id=$1 and ($2::boolean or w.branch_id=any($3::uuid[]) or w.machine_id=any($4::uuid[]))";
const selection = `w.id,w.folio,w.machine_id as "machineId",w.machine_code as "machineCode",w.branch_id as "branchId",
w.source_type as "sourceType",w.source_id as "sourceId",w.ticket_id as "ticketId",w.activity_id as "activityId",
w.assignee_id as "assigneeId",w.assignee_name as "assigneeName",w.template_id as "templateId",w.template_version as "templateVersion",
w.definition,w.state,w.row_version as "rowVersion",
to_char(w.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
to_char(w.due_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "dueAt",
to_char(w.alert_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "alertAt"`;
const can = (subject: AuthorizationSubject, operation: Operation) =>
  authorize(subject, {
    accountId: subject.membershipAccountId,
    permission: `maintenance.orders-${operation}`,
    classification: "CONFIDENTIAL",
    operation: operation === "read" ? "READ" : "WRITE",
  }).allowed;
const actionPermission = (action: WorkOrderAction): Operation =>
  ["correct", "cancel", "reopen"].includes(action)
    ? "review"
    : ["notify", "expire"].includes(action)
      ? "assign"
      : "execute";
function expected(request: SecurityRequest) {
  const value = getHeader(request, "if-match")?.match(/^(?:W\/)?"?(\d+)"?$/)?.[1];
  if (!value || !Number.isSafeInteger(Number(value)) || Number(value) < 1)
    throw new BadRequestException("If-Match requerido.");
  return Number(value);
}
@Injectable()
export class WorkOrdersStore implements OnModuleDestroy {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4,
    connectionTimeoutMillis: 5000,
  });
  constructor(@Inject(IdentityStore) private readonly identity: IdentityStore) {}
  async onModuleDestroy() {
    await this.pool.end();
  }
  private async run<T>(
    request: SecurityRequest,
    operation: Operation,
    callback: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    const contextId = getHeader(request, "x-ice24-context-id");
    if (!contextId || !request.localUser || !request.identityClaims) throw new ForbiddenException();
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query("set local statement_timeout='15s'");
      const active = await client.query(
        `select u.id from identity.context_sessions c join identity.account_memberships m on m.id=c.membership_id join identity.accounts a on a.id=c.account_id join identity.users u on u.id=c.user_id where c.id=$1 and c.user_id=$2 and u.status='ACTIVE' for share of c,m,a,u`,
        [contextId, request.localUser.id],
      );
      if (!active.rowCount) throw new ForbiddenException();
      const subject = await this.identity.getAuthorizationSubject(
        request.localUser.id,
        contextId,
        request.identityClaims.aal,
      );
      if (!can(subject, operation)) {
        if (subject.accountAccessMode === "READ_ONLY" && operation !== "read")
          throw new AccountReadOnlyException(request.correlationId);
        throw new ForbiddenException();
      }
      const result = await callback({
        client,
        subject,
        userId: request.localUser.id,
        contextId,
        correlationId: request.correlationId ?? randomUUID(),
      });
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      const code = (error as { code?: string }).code;
      if (["23505", "40001", "40P01"].includes(code ?? ""))
        throw new ConflictException("La orden cambió o ya existe. Recarga antes de continuar.");
      if (["23503", "23514", "22P02"].includes(code ?? ""))
        throw new BadRequestException("Referencia no válida.");
      throw error;
    } finally {
      client.release();
    }
  }
  private async get(tx: Tx, id: string, lock = false, offline = false) {
    const row = (
      await tx.client.query(
        `select ${selection} from maintenance.work_orders w where ${scoped} and w.id=$5 ${lock ? "for update of w" : ""}`,
        [...scope(tx.subject), id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException();
    if (lock && !offline) {
      const leased = await tx.client.query(
        "select 1 from maintenance.work_order_offline_leases where order_id=$1 and account_id=$2 and state='active' and expires_at>now()",
        [id, tx.subject.membershipAccountId],
      );
      if (leased.rowCount)
        throw new ConflictException(
          "Orden descargada en un dispositivo. Sincroniza o solicita liberar el bloqueo antes de modificarla.",
        );
    }
    return workOrderSchema.parse(row);
  }
  private async offlineReplay<T>(
    tx: Tx,
    request: SecurityRequest,
    operation: string,
    input: unknown,
    parse: (value: unknown) => T,
    write: () => Promise<T>,
  ): Promise<T> {
    const key = getHeader(request, "idempotency-key");
    if (!key || key.length < 8 || key.length > 200)
      throw new BadRequestException("Idempotency-Key requerido.");
    const values = [tx.subject.membershipAccountId, tx.userId, operation, key];
    const digest = createHash("sha256")
      .update(JSON.stringify([input, expected(request)]))
      .digest("hex");
    await tx.client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
      JSON.stringify(values),
    ]);
    const prior = (
      await tx.client.query<{ digest: string; response: unknown }>(
        "select digest,response from maintenance.offline_requests where account_id=$1 and actor_id=$2 and operation=$3 and key=$4",
        values,
      )
    ).rows[0];
    if (prior) {
      if (prior.digest !== digest)
        throw new ConflictException("La clave ya se utilizó con otros datos.");
      return parse(prior.response);
    }
    const result = await write();
    await tx.client.query(
      "insert into maintenance.offline_requests(account_id,actor_id,operation,key,digest,response) values($1,$2,$3,$4,$5,$6)",
      [...values, digest, JSON.stringify(result)],
    );
    return result;
  }
  private async recordConflict(tx: Tx, order: WorkOrder, local: OfflineSyncOperation) {
    const latest = (await executionHistory(tx.client, tx.subject.membershipAccountId, order.id))[0];
    const id = randomUUID();
    const server = {
      order,
      execution: latest?.execution ?? null,
      actorId: latest?.actorId ?? null,
      capturedAt: new Date().toISOString(),
    };
    const fields = conflictFields.filter(
      (field) =>
        JSON.stringify(local.execution[field]) !== JSON.stringify(server.execution?.[field]),
    );
    await tx.client.query(
      `insert into maintenance.synchronization_conflicts(id,account_id,order_id,operation_id,actor_id,device_id,local_snapshot,server_snapshot,disputed_fields) values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        tx.subject.membershipAccountId,
        order.id,
        local.id,
        tx.userId,
        local.deviceId,
        JSON.stringify(local),
        JSON.stringify(server),
        JSON.stringify(fields),
      ],
    );
    await this.audit(
      tx,
      order,
      "WorkOrderSyncConflictDetected",
      `Operación ${local.id}; conflicto ${id}; dispositivo ${local.deviceId}`,
      order,
    );
    return {
      conflictId: id,
      message: "La orden cambió. Ambas versiones se conservaron para revisión.",
    };
  }
  private async conflictsFor(tx: Tx, id?: string): Promise<SynchronizationConflict[]> {
    const rows = await tx.client.query(
      `select c.id,c.account_id as "accountId",c.order_id as "orderId",c.actor_id as "actorId",c.device_id as "deviceId",c.local_snapshot as local,c.server_snapshot as server,c.disputed_fields as fields,
      to_char(c.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
      case when r.conflict_id is null then 'conflict' else 'resolved' end as state,
      case when r.conflict_id is null then null else jsonb_build_object('actorId',r.actor_id,'reason',r.reason,'strategy',r.strategy,'orderVersion',r.order_version,'resolvedAt',to_char(r.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) end as resolution
      from maintenance.synchronization_conflicts c join maintenance.work_orders w on w.id=c.order_id and w.account_id=c.account_id
      left join maintenance.synchronization_resolutions r on r.conflict_id=c.id
      where ${scoped} and ($5::uuid is null or c.id=$5) order by c.created_at desc limit 100`,
      [...scope(tx.subject), id ?? null],
    );
    const conflicts: SynchronizationConflict[] = [];
    for (const row of rows.rows) {
      const conflict = synchronizationConflictSchema.parse(row);
      const order = await this.get(tx, conflict.orderId);
      const execution =
        (await executionHistory(tx.client, tx.subject.membershipAccountId, order.id))[0]
          ?.execution ?? null;
      conflicts.push({ ...conflict, current: { order, execution } });
    }
    return conflicts;
  }
  offlineAccess(request: SecurityRequest) {
    return this.run(request, "read", async (tx) => {
      const permission = authorize(tx.subject, {
        accountId: tx.subject.membershipAccountId,
        permission: "maintenance.orders-execute",
        classification: "CONFIDENTIAL",
        operation: "READ",
      }).allowed;
      const rows = permission
        ? await tx.client.query<{ id: string }>(
            `select distinct w.id from maintenance.work_orders w join maintenance.work_order_offline_leases l on l.order_id=w.id where ${scoped} and l.user_id=$5 and w.assignee_id=$5 and l.expires_at>now()`,
            [...scope(tx.subject), tx.userId],
          )
        : { rows: [] };
      return {
        accountId: tx.subject.membershipAccountId,
        userId: tx.userId,
        serverNow: new Date().toISOString(),
        orderIds: rows.rows.map((row) => row.id),
      };
    });
  }
  /** Self-service audit only: a revoked membership may report loss, never read or change orders. */
  async reportOfflinePurge(userId: string, input: unknown, correlationId: string) {
    const data = offlinePurgeReportSchema.parse(input);
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [data.id]);
      const prior = (
        await client.query<{ actor_id: string; report: unknown }>(
          "select actor_id,report from maintenance.offline_purge_receipts where id=$1",
          [data.id],
        )
      ).rows[0];
      if (prior) {
        if (
          prior.actor_id !== userId ||
          JSON.stringify(prior.report) !== JSON.stringify(JSON.parse(JSON.stringify(data)))
        ) {
          // PostgreSQL jsonb key order is not significant.
          const same =
            prior.actor_id === userId &&
            (
              await client.query("select $1::jsonb=$2::jsonb as same", [
                JSON.stringify(prior.report),
                JSON.stringify(data),
              ])
            ).rows[0]?.same;
          if (!same) throw new ConflictException("Recibo ya utilizado.");
        }
        await client.query("commit");
        return { recorded: true };
      }
      const leases = await client.query<{
        account_id: string;
        order_id: string;
        branch_id: string;
        machine_id: string;
      }>(
        "select l.account_id,l.order_id,w.branch_id,w.machine_id from maintenance.work_order_offline_leases l join maintenance.work_orders w on w.id=l.order_id where l.user_id=$1 and l.id=any($2::uuid[])",
        [userId, data.leaseIds],
      );
      if (leases.rows.length !== new Set(data.leaseIds).size)
        throw new ForbiddenException("Descarga ajena.");
      await client.query(
        "insert into maintenance.offline_purge_receipts(id,actor_id,report) values($1,$2,$3)",
        [data.id, userId, JSON.stringify(data)],
      );
      for (const lease of leases.rows)
        await client.query(
          `insert into audit.events(occurred_at_utc,time_zone,actor_type,actor_user_id,account_id,branch_id,machine_id,entity_type,entity_id,operation,previous_values,new_values,reason,origin,result,correlation_id) values(now(),'UTC','USER',$1,$2,$3,$4,'work_order',$5,'OfflineLocalDataPurged',null,$6,$7,'API','SUCCESS',$8)`,
          [
            userId,
            lease.account_id,
            lease.branch_id,
            lease.machine_id,
            lease.order_id,
            JSON.stringify({
              receiptId: data.id,
              operationIds: data.operationIds,
              reportedByDevice: true,
            }),
            data.reason,
            correlationId,
          ],
        );
      await client.query("commit");
      return { recorded: true };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  listConflicts(request: SecurityRequest) {
    return this.run(request, "read", async (tx) => ({
      items: await this.conflictsFor(tx),
      canResolve: can(tx.subject, "review"),
      policy: "F7-D02-proposal",
    }));
  }
  resolveConflict(request: SecurityRequest, id: string, input: unknown) {
    ticketIdSchema.parse(id);
    const data = conflictResolutionSchema.parse(input),
      version = expected(request);
    return this.run(request, "review", async (tx) => {
      const conflict = (await this.conflictsFor(tx, id))[0];
      if (!conflict) throw new NotFoundException();
      const order = await this.get(tx, conflict.orderId, true, true);
      return this.offlineReplay(
        tx,
        request,
        `resolve:${id}`,
        data,
        workOrderSchema.parse,
        async () => {
          if (conflict.state === "resolved")
            throw new ConflictException("El conflicto ya fue resuelto.");
          // Re-read after the order lock: another resolver may have committed while we waited.
          if ((await this.conflictsFor(tx, id))[0]?.state === "resolved")
            throw new ConflictException("El conflicto ya fue resuelto.");
          if (order.rowVersion !== version)
            throw new ConflictException(
              "El servidor cambió después de la comparación. No se aplicó la resolución; solicita una nueva revisión.",
            );
          if (
            ![
              "in_progress",
              "completed",
              "with_observations",
              "nonconforming",
              "corrected",
            ].includes(order.state)
          )
            throw new ConflictException("El estado actual no admite resolución de ejecución.");
          const lease = (
            await tx.client.query<{ id: string }>(
              "select id from maintenance.work_order_offline_leases where order_id=$1 and state='active' and expires_at>now() for update",
              [order.id],
            )
          ).rows[0];
          if (lease && lease.id !== conflict.local.leaseId)
            throw new ConflictException(
              "Otra descarga está activa. Libera ese bloqueo antes de resolver.",
            );
          if (lease)
            await tx.client.query("select set_config('ice24.offline_lease',$1,true)", [lease.id]);
          const machine = await this.machine(tx, order.machineId);
          if (machine.branch_id !== order.branchId)
            throw new ConflictException("La máquina cambió de sucursal.");
          let execution;
          try {
            execution = conflictExecution(conflict, data);
          } catch {
            throw new BadRequestException(
              "Selecciona una versión disponible y todos los campos de la combinación.",
            );
          }
          if (execution.evidence.some((e) => e.type === "photo")) this.assertEvidenceAccess(tx);
          const closed = order.state !== "in_progress";
          const closing = closed || conflict.local.action === "close";
          const revision = await appendExecution(
            tx.client,
            tx.subject.membershipAccountId,
            order,
            tx.userId,
            execution,
            closed ? "correction" : closing ? "closure" : "draft",
            data.reason,
          );
          let changed: WorkOrder;
          if (closed) {
            await tx.client.query(
              "insert into maintenance.work_order_reviews(account_id,order_id,revision_id,actor_id,action,reason) values($1,$2,$3,$4,'correct',$5)",
              [tx.subject.membershipAccountId, order.id, revision.id, tx.userId, data.reason],
            );
            changed = await this.applyTransition(tx, order, "correct", data.reason, version, {
              correctionRecorded: true,
            });
          } else if (closing) {
            const action =
              execution.result === "conforming"
                ? "complete"
                : execution.result === "observations"
                  ? "observe"
                  : "reject";
            changed = await this.applyTransition(tx, order, action, data.reason, version, {
              conflictResolutionAuthorized: can(tx.subject, "review"),
              executionComplete: true,
              evidenceComplete: true,
              result: execution.result,
              followupRecorded: execution.followup.trim().length >= 5,
            });
          } else {
            await tx.client.query(
              "update maintenance.work_orders set row_version=row_version where id=$1",
              [order.id],
            );
            changed = await this.get(tx, order.id);
          }
          await tx.client.query(
            "insert into maintenance.synchronization_resolutions(conflict_id,account_id,actor_id,strategy,reason,choices,order_version) values($1,$2,$3,$4,$5,$6,$7)",
            [
              id,
              tx.subject.membershipAccountId,
              tx.userId,
              data.strategy,
              data.reason,
              JSON.stringify(data.choices ?? null),
              changed.rowVersion,
            ],
          );
          await tx.client.query(
            "update maintenance.work_order_offline_leases set state='completed',ended_at=now(),reason=$2 where id=$1 and state='active'",
            [conflict.local.leaseId, data.reason],
          );
          await this.audit(
            tx,
            changed,
            "WorkOrderSyncConflictResolved",
            `${id}: ${data.reason}`,
            order,
          );
          return changed;
        },
      );
    });
  }

  downloadOffline(request: SecurityRequest, id: string, input: unknown) {
    ticketIdSchema.parse(id);
    const data = offlineDownloadSchema.parse(input);
    const version = expected(request);
    return this.run(request, "execute", async (tx) => {
      const order = await this.get(tx, id, true, true);
      await this.assertExecutor(tx, order);
      const packet = await this.offlineReplay(
        tx,
        request,
        `download:${id}`,
        data,
        offlineOrderPackageSchema.parse,
        async () => {
          if (order.rowVersion !== version)
            throw new ConflictException("La orden cambió; actualiza antes de descargar.");
          const active = await tx.client.query(
            "select id from maintenance.work_order_offline_leases where order_id=$1 and state='active'",
            [id],
          );
          if (active.rowCount)
            throw new ConflictException(
              "La orden ya tiene un bloqueo. Sincroniza o libera la descarga anterior.",
            );
          let current = order;
          if (["scheduled", "upcoming", "overdue"].includes(order.state))
            current = await this.applyTransition(
              tx,
              order,
              "start",
              "Inicio para trabajo sin conexión",
              version,
            );
          if (current.state !== "in_progress")
            throw new ConflictException("Solo se descargan órdenes pendientes o en atención.");
          const lease = (
            await tx.client.query(
              `insert into maintenance.work_order_offline_leases(account_id,order_id,user_id,device_id,expires_at)
           values($1,$2,$3,$4,now()+interval '72 hours') returning id,device_id as "deviceId",user_id as "userId",
           to_char(downloaded_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "downloadedAt",
           to_char(expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "expiresAt"`,
              [tx.subject.membershipAccountId, id, tx.userId, data.deviceId],
            )
          ).rows[0];
          await this.audit(tx, current, "WorkOrderDownloaded", JSON.stringify(lease), order);
          const revisions = await executionHistory(tx.client, tx.subject.membershipAccountId, id);
          return offlineOrderPackageSchema.parse({
            formatVersion: 1,
            accountId: tx.subject.membershipAccountId,
            userId: tx.userId,
            order: current,
            lease,
            execution: revisions[0]?.execution ?? null,
            policy: "F7-D03-proposal",
          });
        },
      );
      const valid = await tx.client.query(
        "select 1 from maintenance.work_order_offline_leases where id=$1 and state='active' and expires_at>now()",
        [packet.lease.id],
      );
      if (!valid.rowCount)
        throw new ConflictException(
          "La descarga venció o fue liberada. Solicita una descarga nueva.",
        );
      return packet;
    });
  }
  releaseOffline(request: SecurityRequest, id: string, input: unknown) {
    ticketIdSchema.parse(id);
    const data = offlineReleaseSchema.parse(input);
    const version = expected(request);
    return this.run(request, "assign", async (tx) => {
      const order = await this.get(tx, id, true, true);
      await this.machine(tx, order.machineId);
      return this.offlineReplay(
        tx,
        request,
        `release:${id}`,
        data,
        workOrderSchema.parse,
        async () => {
          if (order.rowVersion !== version) throw new ConflictException("La orden cambió.");
          const leases = await tx.client.query(
            "update maintenance.work_order_offline_leases set state='released',ended_at=now(),reason=$2 where order_id=$1 and state='active' returning id,device_id,user_id",
            [id, data.reason],
          );
          if (!leases.rowCount) throw new ConflictException("No hay bloqueo activo para liberar.");
          await this.audit(
            tx,
            order,
            "WorkOrderOfflineReleased",
            `${data.reason} · ${JSON.stringify(leases.rows)}`,
            order,
          );
          return order;
        },
      );
    });
  }
  syncOffline(request: SecurityRequest, input: unknown) {
    const data = offlineSyncOperationSchema.parse(input);
    if (
      data.id !== getHeader(request, "idempotency-key") ||
      data.expectedVersion !== expected(request)
    )
      throw new BadRequestException("La operación debe conservar su clave y versión esperada.");
    return this.run(request, "execute", async (tx) => {
      const order = await this.get(tx, data.orderId, true, true);
      await this.assertExecutor(tx, order);
      if (data.execution.evidence.some((e) => e.type === "photo")) this.assertEvidenceAccess(tx);
      const lease = (
        await tx.client.query<{ state: string; valid: boolean }>(
          "select state,expires_at>now() as valid from maintenance.work_order_offline_leases where id=$1 and order_id=$2 and account_id=$3 and user_id=$4 and device_id=$5 for update",
          [data.leaseId, order.id, tx.subject.membershipAccountId, tx.userId, data.deviceId],
        )
      ).rows[0];
      if (!lease)
        throw new ForbiddenException("La descarga no pertenece a este usuario y dispositivo.");
      return this.offlineReplay(
        tx,
        request,
        `sync:${order.id}`,
        data,
        (value) => {
          const conflict = value as { conflictId?: string; message?: string };
          return conflict.conflictId
            ? {
                conflictId: ticketIdSchema.parse(conflict.conflictId),
                message: String(conflict.message),
              }
            : workOrderSchema.parse(value);
        },
        async () => {
          if (
            lease.state !== "active" ||
            !lease.valid ||
            order.rowVersion !== data.expectedVersion ||
            order.state !== "in_progress"
          )
            return this.recordConflict(tx, order, data);
          await verifyExecutionFiles(
            tx.client,
            tx.subject.membershipAccountId,
            order,
            data.execution,
            data.action === "close",
          );
          const assessment = assessWorkOrderExecution(order.definition, data.execution);
          if (data.action === "close" && !assessment.complete)
            throw new BadRequestException(
              "Completa los requisitos de cierre antes de sincronizar.",
            );
          await tx.client.query("select set_config('ice24.offline_lease',$1,true)", [data.leaseId]);
          await appendExecution(
            tx.client,
            tx.subject.membershipAccountId,
            order,
            tx.userId,
            data.execution,
            data.action === "close" ? "closure" : "draft",
            "Sincronización de ejecución offline",
          );
          let changed: WorkOrder;
          if (data.action === "close") {
            const action =
              data.execution.result === "conforming"
                ? "complete"
                : data.execution.result === "observations"
                  ? "observe"
                  : "reject";
            changed = await this.applyTransition(
              tx,
              order,
              action,
              data.execution.followup || "Cierre sincronizado",
              data.expectedVersion,
              {
                executionComplete: true,
                evidenceComplete: true,
                result: data.execution.result,
                followupRecorded: data.execution.followup.trim().length >= 5,
              },
            );
            await tx.client.query(
              "update maintenance.work_order_offline_leases set state='completed',ended_at=now(),reason='Sincronizada' where id=$1",
              [data.leaseId],
            );
          } else {
            await tx.client.query(
              "update maintenance.work_orders set row_version=row_version where id=$1",
              [order.id],
            );
            changed = await this.get(tx, order.id);
          }
          await this.audit(
            tx,
            changed,
            "WorkOrderOfflineSynchronized",
            `Operación ${data.id}; dispositivo ${data.deviceId}`,
            order,
          );
          return changed;
        },
      );
    });
  }
  private async machine(tx: Tx, id: string) {
    const row = (
      await tx.client.query<{
        id: string;
        account_id: string;
        branch_id: string;
        machine_code: string;
        template_id: string;
        version_number: number;
        definition: { activities: unknown[] };
        template_status: string;
      }>(
        `select * from maintenance.work_order_machine_read where id=$5 and account_id=$1 and ($2::boolean or branch_id=any($3::uuid[]) or id=any($4::uuid[])) for share`,
        [...scope(tx.subject), id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException();
    return row;
  }
  private async technicians(tx: Tx, branchId: string, machineId: string, id?: string) {
    return (
      await tx.client.query<{ id: string; name: string }>(
        `select t.id,t.display_name as name from maintenance.work_order_technician_read t where t.account_id=$1 and ($4::uuid is null or t.id=$4)
   and exists(select 1 from authz.user_scopes s where s.membership_id=t.membership_id and s.valid_from<=now() and (s.valid_to is null or s.valid_to>now()) and (s.scope_type='ACCOUNT' or s.branch_id=$2 or s.machine_id=$3))
   and not exists(select 1 from authz.membership_permission_overrides o join authz.permissions p on p.id=o.permission_id where o.membership_id=t.membership_id and p.code='maintenance.orders-execute' and o.effect='DENY' and o.valid_from<=now() and (o.valid_to is null or o.valid_to>now()))
   order by t.display_name,t.id limit 200 for share`,
        [tx.subject.membershipAccountId, branchId, machineId, id ?? null],
      )
    ).rows;
  }
  private async source(tx: Tx, type: "ticket" | "activity", id: string) {
    const ticket =
      type === "ticket"
        ? (
            await tx.client.query<{
              machine_id: string;
              row_version: number;
              activity_id: string | null;
              work_order_id: string | null;
              state: string;
            }>(
              `select w.machine_id,w.row_version,w.activity_id,w.work_order_id,w.state from maintenance.tickets w where ${scoped} and w.id=$5 for update`,
              [...scope(tx.subject), id],
            )
          ).rows[0]
        : undefined;
    if (type === "ticket" && !ticket) throw new NotFoundException();
    const activityId = type === "activity" ? id : (ticket?.activity_id ?? null);
    const activity = activityId
      ? (
          await tx.client.query<{
            id: string;
            machine_id: string;
            template_id: string;
            definition: unknown;
            row_version: number;
            status: string;
            due_at: Date | null;
            alert_at: Date | null;
          }>(
            `select a.* from maintenance.work_order_activity_command a join maintenance.scheduled_activity_read w on w.id=a.id where ${scoped} and a.id=$5 for update of a`,
            [...scope(tx.subject), activityId],
          )
        ).rows[0]
      : undefined;
    if (activityId && !activity) throw new NotFoundException();
    const machine = await this.machine(tx, ticket?.machine_id ?? activity!.machine_id);
    if (activity && activity.machine_id !== machine.id)
      throw new ConflictException("La actividad no pertenece a la máquina del ticket.");
    const existing = (
      await tx.client.query<{ id: string }>(
        `select id from maintenance.work_orders where account_id=$1 and ((source_type=$2 and source_id=$3) or ($4::uuid is not null and activity_id=$4))`,
        [tx.subject.membershipAccountId, type, id, activityId],
      )
    ).rows[0];
    const activities = activity
      ? [workOrderDefinitionSchema.parse(activity.definition)]
      : machine.definition.activities
          .map((v) => activityInputSchema.parse(v))
          .filter((a) => a.category === "maintenance");
    return {
      ticket,
      activity,
      machine,
      activities,
      existingOrderId: existing?.id ?? ticket?.work_order_id ?? null,
      rowVersion: ticket?.row_version ?? activity!.row_version,
    };
  }
  private async replay(
    tx: Tx,
    request: SecurityRequest,
    operation: string,
    input: unknown,
    write: () => Promise<WorkOrder>,
  ) {
    const key = getHeader(request, "idempotency-key");
    if (!key || key.length < 8 || key.length > 200)
      throw new BadRequestException("Idempotency-Key requerido.");
    const values = [tx.userId, tx.subject.membershipAccountId, operation, key];
    const digest = createHash("sha256")
      .update(JSON.stringify([input, getHeader(request, "if-match")]))
      .digest("hex");
    await tx.client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
      JSON.stringify(values),
    ]);
    const prior = (
      await tx.client.query<{ digest: string; response: unknown }>(
        "select digest,response from maintenance.work_order_idempotency where actor_id=$1 and account_id=$2 and operation=$3 and key=$4",
        values,
      )
    ).rows[0];
    if (prior) {
      if (prior.digest !== digest)
        throw new ConflictException("La clave ya se utilizó con otros datos.");
      const order = workOrderSchema.parse(prior.response);
      await this.get(tx, order.id);
      await this.machine(tx, order.machineId);
      return order;
    }
    const result = await write();
    await tx.client.query(
      "insert into maintenance.work_order_idempotency(actor_id,account_id,operation,key,digest,response) values($1,$2,$3,$4,$5,$6)",
      [...values, digest, JSON.stringify(result)],
    );
    return result;
  }
  private async audit(
    tx: Tx,
    order: WorkOrder,
    operation: string,
    reason: string,
    before: WorkOrder | null,
  ) {
    await tx.client.query(
      `insert into audit.events(occurred_at_utc,time_zone,actor_user_id,actor_type,context_session_id,account_id,branch_id,machine_id,entity_type,entity_id,operation,previous_values,new_values,reason,origin,result,correlation_id) values(now(),'America/Mexico_City',$1,'USER',$2,$3,$4,$5,'work_order',$6,$7,$8,$9,$10,'API','SUCCESS',$11)`,
      [
        tx.userId,
        tx.contextId,
        tx.subject.membershipAccountId,
        order.branchId,
        order.machineId,
        order.id,
        operation,
        before ? JSON.stringify(before) : null,
        JSON.stringify(order),
        reason,
        tx.correlationId,
      ],
    );
  }
  list(request: SecurityRequest, input: unknown) {
    const query = workOrderQuerySchema.parse(input);
    return this.run(request, "read", async (tx) => {
      const rows = (
        await tx.client.query(
          `select ${selection} from maintenance.work_orders w where ${scoped} and ($5::uuid is null or w.machine_id=$5) and ($6::uuid is null or w.assignee_id=$6) and ($7::text is null or w.state=$7) and ($8::uuid is null or w.id>$8) and $9<>'downloaded' and ($9<>'pending' or w.state in ('scheduled','upcoming','overdue')) order by w.id limit $10`,
          [
            ...scope(tx.subject),
            query.machineId ?? null,
            query.assigneeId ?? null,
            query.state ?? null,
            query.cursor ?? null,
            query.view,
            query.limit + 1,
          ],
        )
      ).rows;
      const items = rows.slice(0, query.limit);
      return workOrderPageSchema.parse({
        items,
        nextCursor: rows.length > query.limit ? items.at(-1)?.id : null,
      });
    });
  }
  options(request: SecurityRequest, type: "ticket" | "activity", id: string) {
    ticketIdSchema.parse(id);
    return this.run(request, "assign", async (tx) => {
      const source = await this.source(tx, type, id);
      return workOrderOptionsSchema.parse({
        sourceType: type,
        sourceId: id,
        rowVersion: source.rowVersion,
        machineId: source.machine.id,
        machineCode: source.machine.machine_code,
        existingOrderId: source.existingOrderId,
        activities: source.activities,
        technicians: await this.technicians(tx, source.machine.branch_id, source.machine.id),
      });
    });
  }
  create(request: SecurityRequest, input: unknown) {
    const data = workOrderCreateSchema.parse(input);
    const version = expected(request);
    return this.run(request, "assign", (tx) =>
      this.replay(tx, request, "create", data, async () => {
        const source = await this.source(tx, data.sourceType, data.sourceId);
        if (
          source.rowVersion !== version ||
          source.existingOrderId ||
          (source.ticket && source.ticket.state !== "pending_assignment") ||
          (source.activity && source.activity.status !== "pending")
        )
          throw new ConflictException("El origen cambió o ya tiene una orden.");
        const technician = (
          await this.technicians(tx, source.machine.branch_id, source.machine.id, data.assigneeId)
        )[0];
        if (!technician)
          throw new BadRequestException("El técnico no tiene acceso vigente a esta máquina.");
        const definition = source.activities.find((a) => a.code === data.activityCode);
        if (!definition) throw new BadRequestException("Selecciona una actividad de la plantilla.");
        let templateId = source.machine.template_id,
          templateVersion = source.machine.version_number;
        if (source.activity) {
          templateId = source.activity.template_id;
          const row = (
            await tx.client.query<{ version_number: number }>(
              "select version_number from maintenance.work_order_template_read where id=$1",
              [templateId],
            )
          ).rows[0];
          if (!row) throw new ConflictException();
          templateVersion = row.version_number;
        }
        const count = (
          await tx.client.query<{ value: string }>(
            "insert into maintenance.work_order_counters(account_id,value) values($1,1) on conflict(account_id) do update set value=maintenance.work_order_counters.value+1 returning value",
            [tx.subject.membershipAccountId],
          )
        ).rows[0]!;
        const id = randomUUID();
        await tx.client.query(
          `insert into maintenance.work_orders(id,account_id,branch_id,machine_id,machine_code,folio,source_type,source_id,ticket_id,activity_id,assignee_id,assignee_name,template_id,template_version,definition,state,due_at,alert_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'scheduled',$16,$17)`,
          [
            id,
            tx.subject.membershipAccountId,
            source.machine.branch_id,
            source.machine.id,
            source.machine.machine_code,
            `OT-${count.value.padStart(6, "0")}`,
            data.sourceType,
            data.sourceId,
            data.sourceType === "ticket" ? data.sourceId : null,
            source.activity?.id ?? null,
            data.assigneeId,
            technician.name,
            templateId,
            templateVersion,
            JSON.stringify(definition),
            source.activity?.due_at ?? null,
            source.activity?.alert_at ??
              (source.activity?.due_at
                ? new Date(source.activity.due_at.getTime() - 7 * 86400000)
                : null),
          ],
        );
        if (source.ticket)
          await tx.client.query("update maintenance.tickets set work_order_id=$2 where id=$1", [
            data.sourceId,
            id,
          ]);
        if (source.activity)
          await tx.client.query(
            "update maintenance.work_order_activity_command set assignee_id=$2 where id=$1",
            [source.activity.id, data.assigneeId],
          );
        let order = await this.get(tx, id);
        await this.audit(tx, order, "WorkOrderCreated", data.reason, null);
        if (order.ticketId)
          await this.auditTicket(
            tx,
            order,
            "TicketAssigned",
            "pending_assignment",
            "pending_assignment",
            data.reason,
          );
        // Time transitions are explicit and audited even when creation occurs after the deadline.
        const timeAction =
          order.dueAt && Date.parse(order.dueAt) <= Date.now()
            ? "expire"
            : order.alertAt && Date.parse(order.alertAt) <= Date.now()
              ? "notify"
              : null;
        if (timeAction)
          order = await this.applyTransition(
            tx,
            order,
            timeAction,
            "Clasificación por fecha al asignar",
            order.rowVersion,
          );
        return order;
      }),
    );
  }
  private async facts(
    tx: Tx,
    order: WorkOrder,
    action: WorkOrderAction,
    reason: string,
    version: number,
  ): Promise<WorkOrderFacts> {
    return {
      state: order.state,
      version: order.rowVersion,
      expectedVersion: version,
      permitted: can(tx.subject, actionPermission(action)),
      assignedToActor: order.assigneeId === tx.userId,
      assigneeActive:
        (await this.technicians(tx, order.branchId, order.machineId, order.assigneeId)).length > 0,
      now: Date.now(),
      dueAt: order.dueAt ? Date.parse(order.dueAt) : null,
      alertAt: order.alertAt ? Date.parse(order.alertAt) : null,
      reason,
      // P4/P5 own execution and review records. P3 cannot manufacture successful closure facts.
      executionComplete: false,
      evidenceComplete: false,
      result: null,
      followupRecorded: false,
      correctionRecorded: false,
      cancellationRecorded: false,
      reopeningRecorded: false,
    };
  }
  private async applyTransition(
    tx: Tx,
    order: WorkOrder,
    action: WorkOrderAction,
    reason: string,
    version: number,
    trusted: Partial<
      Pick<
        WorkOrderFacts,
        | "executionComplete"
        | "evidenceComplete"
        | "result"
        | "followupRecorded"
        | "correctionRecorded"
        | "cancellationRecorded"
        | "reopeningRecorded"
        | "conflictResolutionAuthorized"
      >
    > = {},
  ) {
    const result = evaluateWorkOrderTransition(action, {
      ...(await this.facts(tx, order, action, reason, version)),
      ...trusted,
    });
    if ("code" in result) {
      if (result.code === "FORBIDDEN") throw new ForbiddenException(result.message);
      throw new ConflictException(result.message);
    }
    await tx.client.query("update maintenance.work_orders set state=$2 where id=$1", [
      order.id,
      result.state,
    ]);
    if (result.state === "in_progress") {
      if (order.ticketId && action === "start") {
        await tx.client.query("update maintenance.tickets set state='in_progress' where id=$1", [
          order.ticketId,
        ]);
        await this.auditTicket(
          tx,
          order,
          "TicketWorkOrderStarted",
          "pending_assignment",
          "in_progress",
          reason || "Inicio por responsable",
        );
      }
      if (order.activityId)
        await tx.client.query(
          "update maintenance.work_order_activity_command set status='in_progress' where id=$1",
          [order.activityId],
        );
    }
    if (["completed", "with_observations", "nonconforming"].includes(result.state)) {
      if (order.activityId)
        await tx.client.query(
          "update maintenance.work_order_activity_command set status='completed' where id=$1",
          [order.activityId],
        );
    }
    const changed = await this.get(tx, order.id);
    await this.audit(tx, changed, "WorkOrderTransitioned", reason || action, order);
    return changed;
  }
  transition(request: SecurityRequest, id: string, input: unknown) {
    ticketIdSchema.parse(id);
    const data = workOrderTransitionSchema.parse(input);
    if (["complete", "observe", "reject"].includes(data.action))
      return this.closeExecution(request, id, data);
    const version = expected(request);
    return this.run(request, actionPermission(data.action), (tx) =>
      this.replay(tx, request, `transition:${id}`, data, async () => {
        const order = await this.get(tx, id, true);
        const machine = await this.machine(tx, order.machineId);
        if (machine.branch_id !== order.branchId)
          throw new ConflictException(
            "La máquina cambió de sucursal. Revisa la orden antes de continuar.",
          );
        return this.applyTransition(tx, order, data.action, data.reason, version);
      }),
    );
  }
  execution(request: SecurityRequest, id: string) {
    ticketIdSchema.parse(id);
    return this.run(request, "read", async (tx) => {
      const order = await this.get(tx, id);
      const revisions = await executionHistory(tx.client, tx.subject.membershipAccountId, id);
      const latest = revisions[0];
      const assessment = latest
        ? assessWorkOrderExecution(order.definition, latest.execution)
        : {
            missing: [{ field: "diagnosis", message: "Guarda la ejecución antes de cerrar." }],
            outOfRange: [],
          };
      if (latest && order.state === "in_progress" && latest.kind !== "draft")
        assessment.missing.push({
          field: "diagnosis",
          message: "Guarda un nuevo borrador de ejecución antes de cerrar.",
        });
      if (latest) {
        try {
          await verifyExecutionFiles(
            tx.client,
            tx.subject.membershipAccountId,
            order,
            latest.execution,
            true,
          );
        } catch (error) {
          if (!(error instanceof BadRequestException) && !(error instanceof ConflictException))
            throw error;
          assessment.missing.push({
            field: "evidence",
            message:
              "Hay fotos pendientes de verificación o no disponibles. Revisa su estado antes de cerrar.",
          });
        }
      }
      const reviews = (
        await tx.client.query(
          `select id,action,reason,actor_id as "actorId",revision_id as "revisionId",to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt" from maintenance.work_order_reviews where account_id=$1 and order_id=$2 order by created_at desc,id desc limit 100`,
          [tx.subject.membershipAccountId, id],
        )
      ).rows;
      const activeAssignee =
        order.assigneeId === tx.userId &&
        (await this.technicians(tx, order.branchId, order.machineId, tx.userId)).length > 0;
      return workOrderExecutionDetailSchema.parse({
        revisions,
        reviews,
        ...assessment,
        canExecute: can(tx.subject, "execute") && activeAssignee && order.state === "in_progress",
        canReview:
          can(tx.subject, "review") &&
          ["completed", "with_observations", "nonconforming", "corrected"].includes(order.state),
        canRequestCorrection:
          can(tx.subject, "execute") &&
          activeAssignee &&
          ["completed", "with_observations", "nonconforming", "corrected"].includes(order.state),
        canReopen:
          can(tx.subject, "review") &&
          ["completed", "with_observations", "nonconforming", "corrected"].includes(order.state),
      });
    });
  }
  saveExecution(request: SecurityRequest, id: string, input: unknown) {
    ticketIdSchema.parse(id);
    const data = workOrderExecutionSchema.parse(input);
    const version = expected(request);
    return this.run(request, "execute", async (tx) => {
      const current = await this.get(tx, id, true);
      await this.assertExecutor(tx, current);
      if (data.evidence.some((e) => e.type === "photo")) this.assertEvidenceAccess(tx);
      return this.replay(tx, request, `execution:${id}`, data, async () => {
        if (current.rowVersion !== version || current.state !== "in_progress")
          throw new ConflictException("La orden cambió o no está en atención.");
        await appendExecution(
          tx.client,
          tx.subject.membershipAccountId,
          current,
          tx.userId,
          data,
          "draft",
          "Guardado de borrador",
        );
        await tx.client.query(
          "update maintenance.work_orders set row_version=row_version where id=$1",
          [id],
        );
        const changed = await this.get(tx, id);
        await this.audit(
          tx,
          changed,
          "WorkOrderExecutionSaved",
          "Guardado de borrador versionado",
          current,
        );
        return changed;
      });
    });
  }
  private async assertExecutor(tx: Tx, order: WorkOrder) {
    const machine = await this.machine(tx, order.machineId);
    if (machine.branch_id !== order.branchId)
      throw new ConflictException("La máquina cambió de sucursal.");
    if (
      order.assigneeId !== tx.userId ||
      !(await this.technicians(tx, order.branchId, order.machineId, tx.userId)).length
    )
      throw new ForbiddenException("Solo el técnico responsable vigente puede ejecutar.");
  }
  private assertEvidenceAccess(tx: Tx) {
    if (
      !authorize(tx.subject, {
        accountId: tx.subject.membershipAccountId,
        permission: "files.read",
        classification: "CONFIDENTIAL",
        operation: "READ",
      }).allowed
    )
      throw new ForbiddenException("No tienes acceso a los archivos de evidencia.");
  }
  private closeExecution(request: SecurityRequest, id: string, input: unknown) {
    const data = workOrderTransitionSchema.parse(input);
    const version = expected(request);
    return this.run(request, "execute", async (tx) => {
      const current = await this.get(tx, id, true);
      await this.assertExecutor(tx, current);
      return this.replay(tx, request, `close:${id}`, data, async () => {
        if (current.rowVersion !== version || current.state !== "in_progress")
          throw new ConflictException("La orden cambió o ya está cerrada.");
        const latest = (await executionHistory(tx.client, tx.subject.membershipAccountId, id))[0];
        if (!latest || latest.kind !== "draft")
          throw new ConflictException("Guarda un nuevo borrador de ejecución antes de cerrar.");
        if (latest.execution.evidence.some((e) => e.type === "photo"))
          this.assertEvidenceAccess(tx);
        const revision = await appendExecution(
          tx.client,
          tx.subject.membershipAccountId,
          current,
          tx.userId,
          latest.execution,
          "closure",
          data.reason || "Cierre conforme",
        );
        return this.applyTransition(tx, current, data.action, data.reason, version, {
          executionComplete: true,
          evidenceComplete: true,
          result: revision.data.result,
          followupRecorded: revision.data.followup.trim().length >= 5,
        });
      });
    });
  }
  review(request: SecurityRequest, id: string, input: unknown) {
    ticketIdSchema.parse(id);
    const data = workOrderReviewSchema.parse(input);
    const version = expected(request);
    return this.run(
      request,
      data.action === "request_correction" ? "execute" : "review",
      async (tx) => {
        const current = await this.get(tx, id, true);
        const machine = await this.machine(tx, current.machineId);
        if (machine.branch_id !== current.branchId)
          throw new ConflictException("La máquina cambió de sucursal.");
        if (data.action === "request_correction") await this.assertExecutor(tx, current);
        return this.replay(tx, request, `review:${id}`, data, async () => {
          if (current.rowVersion !== version)
            throw new ConflictException("La orden cambió. Recarga antes de revisar.");
          if (
            !["completed", "with_observations", "nonconforming", "corrected"].includes(
              current.state,
            )
          )
            throw new ConflictException("Solo se revisan órdenes cerradas.");
          let revisionId =
            (await executionHistory(tx.client, tx.subject.membershipAccountId, id))[0]?.id ?? null;
          if (data.action === "correct") this.assertEvidenceAccess(tx);
          if (data.action === "correct" && data.execution)
            revisionId = (
              await appendExecution(
                tx.client,
                tx.subject.membershipAccountId,
                current,
                tx.userId,
                data.execution,
                "correction",
                data.reason,
              )
            ).id;
          await tx.client.query(
            "insert into maintenance.work_order_reviews(account_id,order_id,revision_id,actor_id,action,reason) values($1,$2,$3,$4,$5,$6)",
            [tx.subject.membershipAccountId, id, revisionId, tx.userId, data.action, data.reason],
          );
          if (data.action === "correct" || data.action === "cancel" || data.action === "reopen")
            return this.applyTransition(tx, current, data.action, data.reason, version, {
              correctionRecorded: data.action === "correct",
              cancellationRecorded: data.action === "cancel",
              reopeningRecorded: data.action === "reopen",
            });
          await tx.client.query(
            "update maintenance.work_orders set row_version=row_version where id=$1",
            [id],
          );
          const changed = await this.get(tx, id);
          await this.audit(
            tx,
            changed,
            data.action === "review" ? "WorkOrderReviewed" : "WorkOrderCorrectionRequested",
            data.reason,
            current,
          );
          return changed;
        });
      },
    );
  }
  assign(request: SecurityRequest, id: string, input: unknown) {
    ticketIdSchema.parse(id);
    const data = workOrderAssignmentSchema.parse(input);
    const version = expected(request);
    return this.run(request, "assign", (tx) =>
      this.replay(tx, request, `assign:${id}`, data, async () => {
        const order = await this.get(tx, id, true);
        const machine = await this.machine(tx, order.machineId);
        if (machine.branch_id !== order.branchId)
          throw new ConflictException(
            "La máquina cambió de sucursal. Revisa la orden antes de continuar.",
          );
        if (
          order.rowVersion !== version ||
          !["scheduled", "upcoming", "overdue"].includes(order.state)
        )
          throw new ConflictException("Solo se puede cambiar responsable antes de iniciar.");
        const technician = (
          await this.technicians(tx, order.branchId, order.machineId, data.assigneeId)
        )[0];
        if (!technician) throw new BadRequestException("Técnico sin acceso vigente.");
        await tx.client.query(
          "update maintenance.work_orders set assignee_id=$2,assignee_name=$3 where id=$1",
          [id, data.assigneeId, technician.name],
        );
        if (order.activityId)
          await tx.client.query(
            "update maintenance.work_order_activity_command set assignee_id=$2 where id=$1",
            [order.activityId, data.assigneeId],
          );
        const changed = await this.get(tx, id);
        await this.audit(tx, changed, "WorkOrderAssigned", data.reason, order);
        return changed;
      }),
    );
  }
  private async auditTicket(
    tx: Tx,
    order: WorkOrder,
    operation: string,
    before: string,
    after: string,
    reason: string,
  ) {
    await tx.client.query(
      `insert into audit.events(occurred_at_utc,time_zone,actor_user_id,actor_type,context_session_id,account_id,branch_id,machine_id,entity_type,entity_id,operation,previous_values,new_values,reason,origin,result,correlation_id) values(now(),'America/Mexico_City',$1,'USER',$2,$3,$4,$5,'maintenance_ticket',$6,$7,$8,$9,$10,'API','SUCCESS',$11)`,
      [
        tx.userId,
        tx.contextId,
        tx.subject.membershipAccountId,
        order.branchId,
        order.machineId,
        order.ticketId,
        operation,
        JSON.stringify({ state: before }),
        JSON.stringify({ state: after, workOrderId: order.id }),
        reason,
        tx.correlationId,
      ],
    );
  }
  detail(request: SecurityRequest, id: string) {
    ticketIdSchema.parse(id);
    return this.run(request, "read", async (tx) => {
      const order = await this.get(tx, id);
      const actions = [];
      for (const transition of workOrderTransitions.filter((t) => t.from === order.state)) {
        const result = evaluateWorkOrderTransition(
          transition.action,
          await this.facts(tx, order, transition.action, "Motivo pendiente", order.rowVersion),
        );
        actions.push({
          action: transition.action,
          allowed: result.allowed,
          message: "message" in result ? result.message : "",
        });
      }
      const events = (
        await tx.client.query(
          `select id,operation,reason,new_values->>'state' as state,to_char(occurred_at_utc at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "occurredAt" from audit.events where account_id=$1 and entity_type='work_order' and entity_id=$2 order by occurred_at_utc,id`,
          [tx.subject.membershipAccountId, id],
        )
      ).rows;
      const offlineLease =
        (
          await tx.client.query(
            `select user_id as "userId",device_id as "deviceId",to_char(downloaded_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "downloadedAt",to_char(expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "expiresAt" from maintenance.work_order_offline_leases where account_id=$1 and order_id=$2 and state='active'`,
            [tx.subject.membershipAccountId, id],
          )
        ).rows[0] ?? null;
      return workOrderDetailSchema.parse({
        order,
        actions,
        offlineLease,
        canReleaseOffline: !!offlineLease && can(tx.subject, "assign"),
        canReassign:
          can(tx.subject, "assign") && ["scheduled", "upcoming", "overdue"].includes(order.state),
        events,
      });
    });
  }
}
