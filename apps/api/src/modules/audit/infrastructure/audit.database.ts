import {
  auditCursorSchema,
  auditEventInputSchema,
  auditEventSchema,
  type AuditEventInput,
  type AuditQuery,
} from "@ice24/contracts";
import { BadRequestException, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { AuditPort, type AuditScope } from "../application/audit.port.js";

const fields = {
  eventVersion: "event_version",
  occurredAt: "occurred_at_utc",
  timeZone: "time_zone",
  actorUserId: "actor_user_id",
  actorType: "actor_type",
  contextSessionId: "context_session_id",
  accountId: "account_id",
  branchId: "branch_id",
  machineId: "machine_id",
  entityType: "entity_type",
  entityId: "entity_id",
  operation: "operation",
  previousValues: "previous_values",
  newValues: "new_values",
  reason: "reason",
  origin: "origin",
  ipAddress: "ip_address",
  deviceSummary: "device_summary",
  result: "result",
  correlationId: "correlation_id",
} as const;
const projection = `jsonb_build_object('id',id,'createdAt',created_at,
  'occurredAtLocal',occurred_at_local,${Object.entries(fields)
    .map(([key, column]) => `'${key}',${column}`)
    .join(",")}) as value`;

// The caller owns BEGIN/COMMIT: use the same client as the business mutation.
export async function appendAuditEvent(
  client: PoolClient,
  input: AuditEventInput,
): Promise<string> {
  const event = auditEventInputSchema.parse(input);
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  const values = keys.map((key) => event[key]);
  const result = await client.query<{ id: string }>(
    `insert into audit.events(${keys.map((key) => fields[key]).join(",")})
     values(${keys.map((_, index) => `$${index + 1}`).join(",")}) returning id`,
    values,
  );
  return result.rows[0]!.id;
}

export function auditWhere(scope: AuditScope, query: AuditQuery, id?: string) {
  const values: unknown[] = [];
  const clauses: string[] = [];
  const bind = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (scope.accountId !== null) clauses.push(`account_id=${bind(scope.accountId)}::uuid`);
  if (!scope.accountWide)
    clauses.push(
      `(branch_id=any(${bind(scope.branchIds)}::uuid[]) or machine_id=any(${bind(scope.machineIds)}::uuid[]))`,
    );
  if (id) clauses.push(`id=${bind(id)}::uuid`);
  for (const key of [
    "accountId",
    "branchId",
    "machineId",
    "actorUserId",
    "entityId",
    "entityType",
    "operation",
    "result",
    "correlationId",
  ] as const) {
    if (query[key] !== undefined) clauses.push(`${fields[key]}=${bind(query[key])}`);
  }
  if (query.from) clauses.push(`occurred_at_utc>=${bind(query.from)}::timestamptz`);
  if (query.to) clauses.push(`occurred_at_utc<=${bind(query.to)}::timestamptz`);
  if (query.cursor) {
    let cursor: unknown;
    try {
      cursor = JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8"));
    } catch {
      throw new BadRequestException("Invalid audit cursor");
    }
    const decoded = auditCursorSchema.safeParse(cursor);
    if (!decoded.success) throw new BadRequestException("Invalid audit cursor");
    clauses.push(
      `(occurred_at_utc,id)<(${bind(decoded.data[0])}::timestamptz,${bind(decoded.data[1])}::uuid)`,
    );
  }
  return { values, where: clauses.length ? clauses.join(" and ") : "true" };
}

@Injectable()
export class AuditDatabase extends AuditPort implements OnModuleDestroy {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  });
  async onModuleDestroy() {
    await this.pool.end();
  }
  override async list(scope: AuditScope, query: AuditQuery) {
    const { values, where } = auditWhere(scope, query);
    values.push(query.limit + 1);
    const result = await this.pool.query<{ value: unknown; cursor_time: string; id: string }>(
      `select ${projection},id,to_char(occurred_at_utc at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as cursor_time
       from audit.events where ${where} order by occurred_at_utc desc,id desc limit $${values.length}`,
      values,
    );
    const hasMore = result.rows.length > query.limit;
    const rows = result.rows.slice(0, query.limit);
    const last = rows.at(-1);
    return {
      items: rows.map((row) => auditEventSchema.parse(row.value)),
      page: {
        hasMore,
        nextCursor:
          hasMore && last
            ? Buffer.from(JSON.stringify([last.cursor_time, last.id])).toString("base64url")
            : null,
      },
    };
  }
  override async detail(scope: AuditScope, id: string) {
    const { values, where } = auditWhere(scope, { limit: 1 }, id);
    const result = await this.pool.query<{ value: unknown }>(
      `select ${projection} from audit.events where ${where}`,
      values,
    );
    return result.rows[0] ? auditEventSchema.parse(result.rows[0].value) : null;
  }
}
