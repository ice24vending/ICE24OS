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
} from "@ice24/contracts";
import {
  evaluateWorkOrderTransition,
  workOrderTransitions,
  type WorkOrderAction,
  type WorkOrderFacts,
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
  ["correct", "cancel"].includes(action)
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
  private async get(tx: Tx, id: string, lock = false) {
    const row = (
      await tx.client.query(
        `select ${selection} from maintenance.work_orders w where ${scoped} and w.id=$5 ${lock ? "for update of w" : ""}`,
        [...scope(tx.subject), id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException();
    return workOrderSchema.parse(row);
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
    };
  }
  private async applyTransition(
    tx: Tx,
    order: WorkOrder,
    action: WorkOrderAction,
    reason: string,
    version: number,
  ) {
    const result = evaluateWorkOrderTransition(
      action,
      await this.facts(tx, order, action, reason, version),
    );
    if ("code" in result) {
      if (result.code === "FORBIDDEN") throw new ForbiddenException(result.message);
      throw new ConflictException(result.message);
    }
    await tx.client.query("update maintenance.work_orders set state=$2 where id=$1", [
      order.id,
      result.state,
    ]);
    if (result.state === "in_progress") {
      if (order.ticketId) {
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
    const changed = await this.get(tx, order.id);
    await this.audit(tx, changed, "WorkOrderTransitioned", reason || action, order);
    return changed;
  }
  transition(request: SecurityRequest, id: string, input: unknown) {
    ticketIdSchema.parse(id);
    const data = workOrderTransitionSchema.parse(input);
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
      return workOrderDetailSchema.parse({
        order,
        actions,
        canReassign:
          can(tx.subject, "assign") && ["scheduled", "upcoming", "overdue"].includes(order.state),
        events,
      });
    });
  }
}
