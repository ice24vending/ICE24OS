import { createHash, randomUUID } from "node:crypto";
import { authorize, type AuthorizationSubject } from "@ice24/authorization";
import {
  ticketInputSchema,
  ticketIdSchema,
  ticketDiagnosisSchema,
  ticketSchema,
  ticketDetailSchema,
  ticketPageSchema,
  ticketQuerySchema,
  ticketOptionsSchema,
  type Ticket,
} from "@ice24/contracts";
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

const selection = `t.id,t.folio,t.machine_id as "machineId",t.machine_code as "machineCode",
t.system_id as "systemId",t.system_name as "systemName",t.component_id as "componentId",t.component_name as "componentName",
t.priority,t.description,t.diagnosis,t.state,t.activity_id as "activityId",t.work_order_id as "workOrderId",
t.row_version as "rowVersion",to_char(t.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
array(select e.file_id from maintenance.ticket_evidence e where e.ticket_id=t.id order by e.file_id) as "evidenceIds"`;
type Transaction = {
  client: PoolClient;
  subject: AuthorizationSubject;
  userId: string;
  contextId: string;
  correlationId: string;
};
const scopeValues = (s: AuthorizationSubject) => [
  s.membershipAccountId,
  s.accountWide,
  [...s.branchIds],
  [...s.machineIds],
];
const scoped =
  "t.account_id=$1 and ($2::boolean or t.branch_id=any($3::uuid[]) or t.machine_id=any($4::uuid[]))";

// Enrich reads only. Original command/replay payloads and field-app packages stay unchanged.
const readSelection = `${selection}, t.branch_id as "branchId",
  coalesce(b.data->>'name','Sucursal sin nombre') as "branchName",
  reporter.person as "reportedBy",
  case when w.id is not null then jsonb_build_object('id',w.assignee_id,'name',w.assignee_name) end as "assignedTo",
  w.folio as "workOrderFolio",
  case when w.state in ('completed','corrected') then 'completed'
    when w.state='cancelled' then 'cancelled'
    when w.state in ('in_progress','with_observations','nonconforming') then 'in_progress'
    else t.state end as "displayState",
  to_char(resolution.at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "resolvedAt"`;
const readJoins = `
  left join equipment.branches b on b.id=t.branch_id and b.account_id=t.account_id
  left join maintenance.work_orders w on w.id=t.work_order_id and w.account_id=t.account_id
  left join lateral (
    select jsonb_build_object('id',u.id,'name',u.display_name) as person
    from audit.events e join identity.users u on u.id=e.actor_user_id
    where e.account_id=t.account_id and e.entity_type='maintenance_ticket'
      and e.entity_id=t.id and e.operation='TicketCreated' and e.result='SUCCESS'
    order by e.occurred_at_utc,e.id limit 1
  ) reporter on true
  left join lateral (
    select max(e.occurred_at_utc) as at from audit.events e
    where e.account_id=t.account_id and e.result='SUCCESS'
      and ((e.entity_type='maintenance_ticket' and e.entity_id=t.id)
        or (e.entity_type='work_order' and e.entity_id=w.id))
      and e.new_values->>'state' in ('completed','corrected')
      and coalesce(e.previous_values->>'state','') not in ('completed','corrected')
  ) resolution on true`;
const accountClock = `select coalesce(nullif(details->>'timezone',''),'America/Mexico_City') as zone,
  now() as at from identity.accounts where id=$1`;
const openTicket = `"displayState" in ('pending_assignment','in_progress')`;
const resolvedToday = `"displayState"='completed' and ("resolvedAt"::timestamptz at time zone clock.zone)::date=(clock.at at time zone clock.zone)::date`;

@Injectable()
export class TicketsStore implements OnModuleDestroy {
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
    action: "read" | "create" | "edit",
    callback: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    const contextId = getHeader(request, "x-ice24-context-id");
    if (!request.localUser || !request.identityClaims || !contextId) throw new ForbiddenException();
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query("set local statement_timeout='15s'");
      await client.query(
        `select c.id from identity.context_sessions c join identity.account_memberships m on m.id=c.membership_id
        join identity.accounts a on a.id=c.account_id where c.id=$1 and c.user_id=$2 for share of c,m,a`,
        [contextId, request.localUser.id],
      );
      const subject = await this.identity.getAuthorizationSubject(
        request.localUser.id,
        contextId,
        request.identityClaims.aal,
      );
      const decision = authorize(subject, {
        accountId: subject.membershipAccountId,
        permission: `maintenance.tickets-${action}`,
        classification: "CONFIDENTIAL",
        operation: action === "read" ? "READ" : "WRITE",
      });
      if (!decision.allowed) {
        if (decision.reason === "account_read_only")
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
        throw new ConflictException("Recarga y vuelve a intentar.");
      if (["23503", "23514", "22P02"].includes(code ?? ""))
        throw new BadRequestException("Referencia no válida.");
      throw error;
    } finally {
      client.release();
    }
  }
  private async machine(tx: Transaction, id: string) {
    const row = (
      await tx.client.query<{
        id: string;
        account_id: string;
        branch_id: string;
        machine_code: string;
        operational_status: string;
        definition: { systems: string[]; components: string[] };
      }>(
        `select * from maintenance.ticket_machine_read where id=$5 and account_id=$1 and ($2::boolean or branch_id=any($3::uuid[]) or id=any($4::uuid[])) for share`,
        [...scopeValues(tx.subject), id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException();
    return row;
  }
  private async get(tx: Transaction, id: string, lock = false): Promise<Ticket> {
    const row = (
      await tx.client.query(
        `select ${selection} from maintenance.tickets t where ${scoped} and t.id=$5 ${lock ? "for update of t" : ""}`,
        [...scopeValues(tx.subject), id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException();
    return ticketSchema.parse(row);
  }
  private async replay(
    tx: Transaction,
    request: SecurityRequest,
    operation: string,
    input: unknown,
    write: () => Promise<Ticket>,
  ) {
    const key = getHeader(request, "idempotency-key");
    if (!key || key.length < 8 || key.length > 200)
      throw new BadRequestException("Idempotency-Key requerido.");
    const digest = createHash("sha256")
      .update(JSON.stringify([input, getHeader(request, "if-match")]))
      .digest("hex");
    const values = [tx.userId, tx.subject.membershipAccountId, operation, key];
    await tx.client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
      JSON.stringify(values),
    ]);
    const previous = (
      await tx.client.query<{ digest: string; response: unknown }>(
        "select digest,response from maintenance.ticket_idempotency where actor_id=$1 and account_id=$2 and operation=$3 and key=$4",
        values,
      )
    ).rows[0];
    if (previous) {
      if (previous.digest !== digest)
        throw new ConflictException("La clave ya se utilizó con otros datos.");
      const ticket = ticketSchema.parse(previous.response);
      await this.get(tx, ticket.id); // Reauthorize resource before replay after scope changes.
      return ticket;
    }
    const result = await write();
    await tx.client.query(
      "insert into maintenance.ticket_idempotency(actor_id,account_id,operation,key,digest,response) values($1,$2,$3,$4,$5,$6)",
      [...values, digest, JSON.stringify(result)],
    );
    return result;
  }
  private async audit(
    tx: Transaction,
    ticket: Ticket,
    operation: string,
    reason: string,
    before: Ticket | null,
  ) {
    await tx.client.query(
      `insert into audit.events(occurred_at_utc,time_zone,actor_user_id,actor_type,context_session_id,account_id,
      branch_id,machine_id,entity_type,entity_id,operation,previous_values,new_values,reason,origin,result,correlation_id)
      select now(),'America/Mexico_City',$1,'USER',$2,t.account_id,t.branch_id,t.machine_id,'maintenance_ticket',t.id,$4,$5,$6,$7,'API','SUCCESS',$8
      from maintenance.tickets t where t.id=$3`,
      [
        tx.userId,
        tx.contextId,
        ticket.id,
        operation,
        before ? JSON.stringify(before) : null,
        JSON.stringify(ticket),
        reason,
        tx.correlationId,
      ],
    );
  }
  list(request: SecurityRequest, input: unknown) {
    const query = ticketQuerySchema.parse(input);
    const recent = query.sort === "recent";
    const point = recent ? query.cursor?.split("|") : undefined;
    // Only fixed SQL fragments vary. Cursor values are always bound parameters.
    const pageOrder = recent ? '"_reportedAt" desc,id desc' : "id";
    const aggregateOrder = recent ? 'p."_reportedAt" desc,p.id desc' : "p.id";
    const afterCursor = recent ? '("_reportedAt",id)<($14::timestamptz,$12::uuid)' : "id>$12";
    return this.run(request, "read", async (tx) => {
      // One statement provides a consistent snapshot. KPI/facets use the entire authorized
      // scope; filters and cursor apply only to rows. Never compute totals from a loaded page.
      const result = (
        await tx.client.query(
          `
        with clock as (${accountClock}),
        scoped_tickets as materialized (
          select ${readSelection},t.created_at as "_reportedAt" from maintenance.tickets t ${readJoins} where ${scoped}
        ), filtered as (
          select s.* from scoped_tickets s cross join clock
          where ($5::uuid is null or "machineId"=$5)
            and ($6::uuid is null or "branchId"=$6)
            and ($7::text is null or "displayState"=$7)
            and ($8::text is null or priority=$8)
            and ($9::date is null or "createdAt"::timestamptz >= ($9::date::timestamp at time zone clock.zone))
            and ($10::date is null or "createdAt"::timestamptz < (($10::date+1)::timestamp at time zone clock.zone))
            and ($11::text is null
              or ($11='open' and ${openTicket})
              or ($11='unassigned' and ${openTicket} and "workOrderId" is null)
              or ($11='highPriority' and ${openTicket} and priority in ('high','critical'))
              or ($11='resolvedToday' and ${resolvedToday}))
        )
        select
          coalesce((select jsonb_agg(jsonb_build_object(
            'ticket',to_jsonb(p)-'_reportedAt',
            'recentCursor',to_char(p."_reportedAt" at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||'|'||p.id::text
          ) order by ${aggregateOrder}) from (
            select * from filtered where ($12::uuid is null or ${afterCursor}) order by ${pageOrder} limit $13
          ) p),'[]'::jsonb) as items,
          (select count(*)::int from filtered) as total,
          (select jsonb_build_object(
            'open',count(*) filter (where ${openTicket}),
            'unassigned',count(*) filter (where ${openTicket} and "workOrderId" is null),
            'highPriority',count(*) filter (where ${openTicket} and priority in ('high','critical')),
            'resolvedToday',count(*) filter (where ${resolvedToday}),
            'timeZone',clock.zone,'asOf',to_char(clock.at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
           from clock left join scoped_tickets on true group by clock.zone,clock.at) as summary,
          jsonb_build_object(
            'branches',coalesce((select jsonb_agg(b order by b.name,b.id) from (
              select distinct "branchId" as id,"branchName" as name from scoped_tickets
            ) b),'[]'::jsonb),
            'machines',coalesce((select jsonb_agg(m order by m.name,m.id) from (
              select distinct "machineId" as id,"machineCode" as name,"branchId" from scoped_tickets
            ) m),'[]'::jsonb)) as filters`,
          [
            ...scopeValues(tx.subject),
            query.machineId ?? null,
            query.branchId ?? null,
            query.state ?? null,
            query.priority ?? null,
            query.from ?? null,
            query.to ?? null,
            query.metric ?? null,
            recent ? (point?.[1] ?? null) : (query.cursor ?? null),
            query.limit + 1,
            ...(recent ? [point?.[0] ?? null] : []),
          ],
        )
      ).rows[0]!;
      const rows = result.items as { ticket: Ticket; recentCursor: string }[];
      const page = rows.slice(0, query.limit);
      const last = page.at(-1);
      return ticketPageSchema.parse({
        ...result,
        items: page.map((row) => row.ticket),
        nextCursor:
          rows.length > query.limit && last ? (recent ? last.recentCursor : last.ticket.id) : null,
      });
    });
  }
  detail(request: SecurityRequest, id: string) {
    ticketIdSchema.parse(id);
    return this.run(request, "read", async (tx) => {
      const row = (
        await tx.client.query(
          `select ${readSelection} from maintenance.tickets t ${readJoins} where ${scoped} and t.id=$5`,
          [...scopeValues(tx.subject), id],
        )
      ).rows[0];
      if (!row) throw new NotFoundException();
      const ticket = ticketSchema.parse(row);
      const events = (
        await tx.client.query(
          `select e.id,e.operation,e.reason,e.new_values->>'diagnosis' as diagnosis,u.display_name as "actorName",
        to_char(e.occurred_at_utc at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "occurredAt"
        from audit.events e left join identity.users u on u.id=e.actor_user_id
        where e.account_id=$1 and ((e.entity_type='maintenance_ticket' and e.entity_id=$2)
          or (e.entity_type='work_order' and e.entity_id=$3)) and e.result='SUCCESS'
        order by e.occurred_at_utc,e.id`,
          [tx.subject.membershipAccountId, id, ticket.workOrderId],
        )
      ).rows;
      const clock = (await tx.client.query(accountClock, [tx.subject.membershipAccountId]))
        .rows[0]!;
      return ticketDetailSchema.parse({ ticket, events, timeZone: clock.zone });
    });
  }
  options(request: SecurityRequest, id: string) {
    ticketIdSchema.parse(id);
    return this.run(request, "read", async (tx) => {
      const machine = await this.machine(tx, id);
      const rows = (
        await tx.client.query<{ id: string; name: string; kind: string }>(
          "select id,name,kind from maintenance.ticket_catalog_read where kind='system' and id=any($1::uuid[]) union all select id,name,'component' as kind from maintenance.ticket_component_read where machine_id=$2 order by name,id",
          [machine.definition.systems, id],
        )
      ).rows;
      return ticketOptionsSchema.parse({
        systems: rows.filter((r) => r.kind === "system"),
        components: rows.filter((r) => r.kind === "component"),
      });
    });
  }
  create(request: SecurityRequest, input: unknown) {
    const data = ticketInputSchema.parse(input);
    return this.run(request, "create", async (tx) => {
      const machine = await this.machine(tx, data.machineId);
      return this.replay(tx, request, "create", data, async () => {
        if (["retired", "suspended"].includes(machine.operational_status))
          throw new ConflictException("La máquina no admite reportes.");
        if (
          !machine.definition.systems.includes(data.systemId) ||
          (data.componentId &&
            !(
              await tx.client.query(
                "select id from maintenance.ticket_component_read where machine_id=$1 and id=$2",
                [data.machineId, data.componentId],
              )
            ).rowCount)
        )
          throw new BadRequestException("El sistema o componente no pertenece a la máquina.");
        const names = (
          await tx.client.query<{ id: string; name: string }>(
            "select id,name from maintenance.ticket_catalog_read where id=any($1::uuid[])",
            [[data.systemId, ...(data.componentId ? [data.componentId] : [])]],
          )
        ).rows;
        if (
          data.activityId &&
          !(
            await tx.client.query(
              "select id from maintenance.scheduled_activity_read where id=$1 and machine_id=$2 and account_id=$3",
              [data.activityId, data.machineId, tx.subject.membershipAccountId],
            )
          ).rowCount
        )
          throw new NotFoundException();
        if (data.evidenceIds.length) {
          if (
            !authorize(tx.subject, {
              accountId: tx.subject.membershipAccountId,
              permission: "files.read",
              classification: "CONFIDENTIAL",
              operation: "READ",
            }).allowed
          )
            throw new ForbiddenException();
          const evidence = (
            await tx.client.query(
              "select distinct id from files.ticket_evidence_read where account_id=$1 and machine_id=$2 and id=any($3::uuid[]) and status in ('VERIFYING','AVAILABLE')",
              [tx.subject.membershipAccountId, data.machineId, data.evidenceIds],
            )
          ).rows;
          if (evidence.length !== data.evidenceIds.length)
            throw new BadRequestException(
              "La evidencia no está confirmada o no pertenece a esta máquina.",
            );
        }
        const counter = (
          await tx.client.query<{ value: string }>(
            "insert into maintenance.ticket_counters(account_id,value) values($1,1) on conflict(account_id) do update set value=maintenance.ticket_counters.value+1 returning value",
            [tx.subject.membershipAccountId],
          )
        ).rows[0]!;
        const id = randomUUID();
        await tx.client.query(
          `insert into maintenance.tickets(id,account_id,branch_id,machine_id,machine_code,folio,system_id,system_name,component_id,component_name,priority,description,activity_id)
          values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            id,
            tx.subject.membershipAccountId,
            machine.branch_id,
            data.machineId,
            machine.machine_code,
            `TKT-${counter.value.padStart(6, "0")}`,
            data.systemId,
            names.find((n) => n.id === data.systemId)!.name,
            data.componentId,
            names.find((n) => n.id === data.componentId)?.name ?? null,
            data.priority,
            data.description,
            data.activityId,
          ],
        );
        for (const fileId of data.evidenceIds)
          await tx.client.query(
            "insert into maintenance.ticket_evidence(ticket_id,file_id) values($1,$2)",
            [id, fileId],
          );
        const ticket = await this.get(tx, id);
        await this.audit(tx, ticket, "TicketCreated", "Reporte inicial", null);
        return ticket;
      });
    });
  }
  diagnose(request: SecurityRequest, id: string, input: unknown) {
    ticketIdSchema.parse(id);
    const data = ticketDiagnosisSchema.parse(input);
    const version = getHeader(request, "if-match")?.match(/^(?:W\/)?"?(\d+)"?$/)?.[1];
    if (!version || !Number.isSafeInteger(Number(version)) || Number(version) < 1)
      throw new BadRequestException("If-Match requerido.");
    return this.run(request, "edit", async (tx) => {
      const before = await this.get(tx, id, true);
      await this.machine(tx, before.machineId); // Transferred machines cannot mutate old-account history.
      return this.replay(tx, request, `diagnose:${id}`, data, async () => {
        if (
          before.rowVersion !== Number(version) ||
          before.state !== "pending_assignment" ||
          before.workOrderId
        )
          throw new ConflictException("El ticket cambió; recarga antes de continuar.");
        await tx.client.query("update maintenance.tickets set diagnosis=$2 where id=$1", [
          id,
          data.diagnosis,
        ]);
        const ticket = await this.get(tx, id);
        await this.audit(tx, ticket, "TicketDiagnosed", data.reason, before);
        return ticket;
      });
    });
  }
}
