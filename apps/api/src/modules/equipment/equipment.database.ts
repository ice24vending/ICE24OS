import { createHash } from "node:crypto";
import { authorize, type AuthorizationSubject } from "@ice24/authorization";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  type OnModuleDestroy,
} from "@nestjs/common";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { SecurityRequest } from "../../common/security/security-request.js";
import { getHeader } from "../../common/security/security-request.js";
import { IdentityStore } from "../identity/identity.store.js";

export interface RecordRow extends QueryResultRow {
  id: string;
  account_id: string;
  branch_id: string;
  row_version: number;
  status: string;
  data: Record<string, unknown>;
  definition: Record<string, unknown>;
  model_id: string;
  machine_id: string;
  template_id: string;
  to_account_id: string;
  to_branch_id: string;
  machine_version: number;
  operational_status: string;
  machine_code: string;
}
export interface Operation {
  userId: string;
  accountId: string;
  contextId: string;
  correlationId: string;
  subject: AuthorizationSubject;
  admin: boolean;
}
export function versionHeader(request: SecurityRequest): number {
  const value = getHeader(request, "if-match");
  const match = value?.match(/^(?:W\/)?"?(\d+)"?$/);
  if (!match?.[1] || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) < 1)
    throw new BadRequestException("If-Match with a positive version is required");
  return Number(match[1]);
}
export function expected(row: RecordRow, version: number): void {
  if (Number(row.row_version) !== version)
    throw new ConflictException("Version conflict; reload the resource");
}
export async function one(
  client: PoolClient,
  sql: string,
  values: unknown[] = [],
): Promise<RecordRow> {
  const row = (await client.query<RecordRow>(sql, values)).rows[0];
  if (!row) throw new NotFoundException("Resource not found");
  return row;
}
export function scope(
  op: Operation,
  row: RecordRow,
  kind: "branch" | "machine" | "account",
  allowAdmin = false,
): void {
  if (allowAdmin && op.admin) return;
  if (row.account_id !== op.accountId) throw new NotFoundException("Resource not found");
  if (op.subject.accountWide) return;
  const allowed =
    kind === "branch"
      ? op.subject.branchIds.has(row.id)
      : kind === "machine"
        ? op.subject.branchIds.has(row.branch_id) || op.subject.machineIds.has(row.id)
        : false;
  if (!allowed) throw new NotFoundException("Resource not found");
}
export async function branch(
  client: PoolClient,
  op: Operation,
  id: string,
  allowAdmin = false,
): Promise<RecordRow> {
  const row = await one(client, "select * from equipment.branches where id=$1 for share", [id]);
  scope(op, row, "branch", allowAdmin);
  if (row.status !== "active") throw new ConflictException("Branch is archived");
  return row;
}
export async function audit(
  client: PoolClient,
  op: Operation,
  row: RecordRow,
  event: string,
  reason: string,
  before: unknown = null,
): Promise<void> {
  await client.query(
    `insert into equipment.events(account_id,resource_id,actor_id,context_id,correlation_id,event_type,reason,before_data,after_data)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      row.account_id ?? null,
      row.id,
      op.userId,
      op.contextId,
      op.correlationId,
      event,
      reason,
      JSON.stringify(before),
      JSON.stringify(row),
    ],
  );
}

@Injectable()
export class EquipmentDatabase implements OnModuleDestroy {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
  constructor(@Inject(IdentityStore) private readonly identity: IdentityStore) {}
  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async run<T>(
    request: SecurityRequest,
    operation: string,
    body: unknown,
    write: boolean,
    callback: (client: PoolClient, op: Operation) => Promise<T>,
    admin = false,
  ): Promise<T> {
    const user = request.localUser;
    const contextId = getHeader(request, "x-ice24-context-id");
    if (!user || !contextId || !request.identityClaims) throw new ForbiddenException();
    const key = getHeader(request, "idempotency-key");
    if (write && (!key || key.length < 8 || key.length > 200))
      throw new BadRequestException("Idempotency-Key is required (8–200 characters)");
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query("set local statement_timeout='15s'");
      // Hold the authorization inputs through commit, so suspension cannot race a mutation.
      await client.query(
        `select c.id from identity.context_sessions c
        join identity.account_memberships m on m.id=c.membership_id join identity.accounts a on a.id=c.account_id
        where c.id=$1 and c.user_id=$2 for share of c,m,a`,
        [contextId, user.id],
      );
      const subject = await this.identity.getAuthorizationSubject(
        user.id,
        contextId,
        request.identityClaims.aal,
      );
      const permission = admin ? "equipment.admin" : write ? "equipment.manage" : "equipment.read";
      const decision = authorize(subject, {
        accountId: subject.membershipAccountId,
        permission,
        classification: admin ? "RESTRICTED" : "CONFIDENTIAL",
        operation: write ? "WRITE" : "READ",
        requiresMfa: write && (admin || /transfer:|:moves|:retire/.test(operation)),
      });
      if (!decision.allowed) throw new ForbiddenException("Operation not authorized");
      const op: Operation = {
        userId: user.id,
        contextId,
        accountId: subject.membershipAccountId,
        subject,
        correlationId: request.correlationId ?? crypto.randomUUID(),
        admin:
          subject.accountWide &&
          authorize(subject, {
            accountId: subject.membershipAccountId,
            permission: "equipment.admin",
            classification: "RESTRICTED",
            operation: "READ",
          }).allowed,
      };
      if (admin && !op.admin) throw new ForbiddenException();
      if (operation.startsWith("members:")) {
        scope(op, { account_id: op.accountId } as RecordRow, "account");
        if (
          !authorize(subject, {
            accountId: op.accountId,
            permission: "identity.membership-manage",
            classification: "RESTRICTED",
            operation: "WRITE",
            requiresMfa: true,
          }).allowed
        )
          throw new ForbiddenException("Membership delegation is not authorized");
      }
      const digest = createHash("sha256")
        .update(JSON.stringify([body, getHeader(request, "if-match")]))
        .digest("hex");
      if (write) {
        await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
          JSON.stringify([user.id, op.accountId, operation, key]),
        ]);
        const previous = (
          await client.query<{ digest: string; response: T }>(
            "select digest,response from equipment.idempotency where actor_id=$1 and account_id=$2 and operation=$3 and key=$4",
            [user.id, op.accountId, operation, key],
          )
        ).rows[0];
        if (previous) {
          if (previous.digest !== digest)
            throw new ConflictException("Idempotency key reused with different input");
          const machineMatch = operation.match(/^machine:([0-9a-f-]{36}):/i);
          if (machineMatch?.[1])
            scope(
              op,
              await one(client, "select * from equipment.machines where id=$1 for share", [
                machineMatch[1],
              ]),
              "machine",
              admin,
            );
          const resource = previous.response as { id?: unknown };
          if (typeof resource?.id === "string") {
            if (operation === "branches" || operation.startsWith("branch:"))
              scope(
                op,
                await one(client, "select * from equipment.branches where id=$1 for share", [
                  resource.id,
                ]),
                "branch",
              );
            if (operation.startsWith("request:")) {
              const row = await one(
                client,
                "select * from equipment.requests where id=$1 for share",
                [resource.id],
              );
              scope(op, { ...row, id: row.branch_id }, "branch", admin);
            }
          }
          await client.query("commit");
          return previous.response;
        }
      }
      const result = await callback(client, op);
      if (write)
        await client.query(
          "insert into equipment.idempotency(actor_id,account_id,operation,key,digest,response) values($1,$2,$3,$4,$5,$6)",
          [user.id, op.accountId, operation, key, digest, JSON.stringify(result)],
        );
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      const code = (error as { code?: string }).code;
      if (code === "23505" || code === "23P01" || code === "40001" || code === "40P01")
        throw new ConflictException("Concurrent operation or duplicate resource; reload and retry");
      if (code === "23503" || code === "22P02" || code === "23514")
        throw new BadRequestException("Invalid resource reference or value");
      throw error;
    } finally {
      client.release();
    }
  }
}
