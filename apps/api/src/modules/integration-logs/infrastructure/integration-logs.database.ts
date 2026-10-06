import {
  integrationLogCursorSchema,
  integrationLogSchema,
  type IntegrationLogPage,
  type IntegrationLogQuery,
} from "@ice24/contracts";
import {
  createSqlIntegrationLogSink,
  type IntegrationLogEntry,
  type IntegrationLogSink,
} from "@ice24/observability";
import { BadRequestException, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";
import {
  IntegrationLogsPort,
  type IntegrationLogScope,
} from "../application/integration-logs.port.js";

const iso = (column: string) =>
  `to_char(${column} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
// Explicit projection of the redacted columns; nothing else exists to leak.
const projection = `jsonb_build_object('id',id,'integration',integration,'operation',operation,
  'direction',direction,'provider',provider,'status',status,'latencyMs',latency_ms,
  'responseCode',response_code,'errorCode',error_code,'retryable',retryable,'attempt',attempt,
  'effectKey',effect_key,'correlationId',correlation_id,'requestCorrelationId',request_correlation_id,
  'accountId',account_id,'jobId',job_id,'details',details,'occurredAt',${iso("occurred_at")})`;

export function integrationLogsWhere(scope: IntegrationLogScope, query: IntegrationLogQuery) {
  const values: unknown[] = [];
  const clauses: string[] = [];
  const bind = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (scope.accountId !== null) clauses.push(`account_id=${bind(scope.accountId)}::uuid`);
  if (query.correlationId) {
    const id = bind(query.correlationId);
    // A webhook that resumed an older correlation is also found by its delivery correlation.
    clauses.push(`(correlation_id=${id}::uuid or request_correlation_id=${id}::uuid)`);
  }
  if (query.integration) clauses.push(`integration=${bind(query.integration)}`);
  if (query.status) clauses.push(`status=${bind(query.status)}`);
  if (query.direction) clauses.push(`direction=${bind(query.direction)}`);
  if (query.accountId) clauses.push(`account_id=${bind(query.accountId)}::uuid`);
  if (query.from) clauses.push(`occurred_at>=${bind(query.from)}::timestamptz`);
  if (query.to) clauses.push(`occurred_at<=${bind(query.to)}::timestamptz`);
  if (query.cursor) {
    let cursor: unknown;
    try {
      cursor = JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8"));
    } catch {
      throw new BadRequestException("Invalid integration log cursor");
    }
    const decoded = integrationLogCursorSchema.safeParse(cursor);
    if (!decoded.success) throw new BadRequestException("Invalid integration log cursor");
    clauses.push(
      `(occurred_at,id)<(${bind(decoded.data[0])}::timestamptz,${bind(decoded.data[1])}::uuid)`,
    );
  }
  return { values, where: clauses.length ? clauses.join(" and ") : "true" };
}

/** Reads the diagnostic view and stores the API's own integration calls. */
@Injectable()
export class IntegrationLogsDatabase
  extends IntegrationLogsPort
  implements IntegrationLogSink, OnModuleDestroy
{
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
  });
  private readonly sink = createSqlIntegrationLogSink(this.pool);

  async onModuleDestroy() {
    await this.pool.end();
  }

  record(entry: IntegrationLogEntry): Promise<void> {
    return this.sink.record(entry);
  }

  override async list(scope: IntegrationLogScope, query: IntegrationLogQuery) {
    const { values, where } = integrationLogsWhere(scope, query);
    values.push(query.limit + 1);
    const result = await this.pool.query<{ value: unknown; cursor_time: string; id: string }>(
      `select ${projection} as value, id, ${iso("occurred_at")} as cursor_time
       from infra.integration_logs where ${where}
       order by occurred_at desc, id desc limit $${values.length}`,
      values,
    );
    const hasMore = result.rows.length > query.limit;
    const rows = result.rows.slice(0, query.limit);
    const last = rows.at(-1);
    const page: IntegrationLogPage = {
      items: rows.map((row) => integrationLogSchema.parse(row.value)),
      page: {
        hasMore,
        nextCursor:
          hasMore && last
            ? Buffer.from(JSON.stringify([last.cursor_time, last.id])).toString("base64url")
            : null,
      },
    };
    return page;
  }
}
