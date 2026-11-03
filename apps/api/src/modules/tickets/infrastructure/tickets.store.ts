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
    return this.run(request, "read", async (tx) => {
      const rows = (
        await tx.client.query(
          `select ${selection} from maintenance.tickets t where ${scoped}
        and ($5::uuid is null or t.machine_id=$5) and ($6::uuid is null or t.id>$6) order by t.id limit $7`,
          [
            ...scopeValues(tx.subject),
            query.machineId ?? null,
            query.cursor ?? null,
            query.limit + 1,
          ],
        )
      ).rows;
      const items = rows.slice(0, query.limit);
      return ticketPageSchema.parse({
        items,
        nextCursor: rows.length > query.limit ? items.at(-1)?.id : null,
      });
    });
  }
  detail(request: SecurityRequest, id: string) {
    ticketIdSchema.parse(id);
    return this.run(request, "read", async (tx) => {
      const ticket = await this.get(tx, id);
      const events = (
        await tx.client.query(
          `select id,operation,reason,new_values->>'diagnosis' as diagnosis,
        to_char(occurred_at_utc at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "occurredAt"
        from audit.events where account_id=$1 and entity_type='maintenance_ticket' and entity_id=$2 order by occurred_at_utc,id`,
          [tx.subject.membershipAccountId, id],
        )
      ).rows;
      return ticketDetailSchema.parse({ ticket, events });
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
        if (before.rowVersion !== Number(version) || before.state !== "pending_assignment")
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
