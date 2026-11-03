import { authorize, type AuthorizationSubject } from "@ice24/authorization";
import {
  maintenanceQuerySchema,
  maintenancePageSchema,
  maintenanceSummarySchema,
  type MaintenanceQuery,
} from "@ice24/contracts";
import { MAINTENANCE_READ_VIEW } from "@ice24/database";
import { ForbiddenException, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";
import type { SecurityRequest } from "../../../common/security/security-request.js";

/** F7-D05 provisional. Time-derived states are projections; no job rewrites historical rows. */
export const maintenanceStateSql = `case when status<>'pending' then status
  when due_at<=now() and criticality='critical' then 'critical'
  when due_at<=now() then 'overdue'
  when coalesce(alert_at,due_at-interval '7 days')<=now() then 'upcoming'
  else 'scheduled' end`;

export function maintenanceWhere(subject: AuthorizationSubject, query: MaintenanceQuery) {
  const values: unknown[] = [
    subject.membershipAccountId,
    subject.accountWide,
    [...subject.branchIds],
    [...subject.machineIds],
  ];
  const clauses = [
    "account_id=$1::uuid",
    "($2::boolean or branch_id=any($3::uuid[]) or machine_id=any($4::uuid[]))",
  ];
  const bind = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (query.state) clauses.push(`(${maintenanceStateSql})=${bind(query.state)}`);
  if (query.branchId) clauses.push(`branch_id=${bind(query.branchId)}::uuid`);
  if (query.machineId) clauses.push(`machine_id=${bind(query.machineId)}::uuid`);
  if (query.assigneeId)
    clauses.push(
      query.assigneeId === "unassigned"
        ? "assignee_id is null"
        : `assignee_id=${bind(query.assigneeId)}::uuid`,
    );
  if (query.period)
    clauses.push(
      "status='pending' and due_at>now() and due_at<=((now() at time zone timezone)+interval '7 days') at time zone timezone",
    );
  return { values, sql: clauses.join(" and ") };
}

@Injectable()
export class MaintenanceStore implements OnModuleDestroy {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  async onModuleDestroy() {
    await this.pool.end();
  }
  private subject(request: SecurityRequest) {
    const subject = request.authorizationSubject;
    if (
      !subject ||
      !authorize(subject, {
        accountId: subject.membershipAccountId,
        permission: "maintenance.read",
        classification: "CONFIDENTIAL",
        operation: "READ",
      }).allowed
    )
      throw new ForbiddenException();
    return subject;
  }
  async list(request: SecurityRequest, input: unknown) {
    const subject = this.subject(request);
    const query = maintenanceQuerySchema.parse(input);
    const where = maintenanceWhere(subject, query);
    if (query.cursor) {
      where.values.push(query.cursor);
      where.sql += ` and id>$${where.values.length}::uuid`;
    }
    where.values.push(query.limit + 1);
    const rows = (
      await this.pool.query(
        `select id,machine_id as "machineId",branch_id as "branchId",machine_code as "machineCode",
      machine_name as "machineName",branch_name as "branchName",activity_code as "activityCode",name,
      (${maintenanceStateSql}) as state,timezone,assignee_id as "assigneeId",row_version as "rowVersion",
      to_char(due_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "dueAt",
      to_char(coalesce(alert_at,due_at-interval '7 days') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "alertAt"
      from ${MAINTENANCE_READ_VIEW} where ${where.sql} order by id limit $${where.values.length}`,
        where.values,
      )
    ).rows;
    const items = rows.slice(0, query.limit);
    return maintenancePageSchema.parse({
      items,
      nextCursor: rows.length > query.limit ? items.at(-1)?.id : null,
    });
  }
  async summary(request: SecurityRequest, input: unknown) {
    const subject = this.subject(request);
    const query = maintenanceQuerySchema.parse(input);
    const where = maintenanceWhere(subject, { ...query, period: "next7days", state: undefined });
    const result = await this.pool.query<{ upcoming: string; asOf: Date }>(
      `select count(*) as upcoming,now() as "asOf" from ${MAINTENANCE_READ_VIEW} where ${where.sql}`,
      where.values,
    );
    return maintenanceSummarySchema.parse({
      upcoming: Number(result.rows[0]!.upcoming),
      asOf: result.rows[0]!.asOf.toISOString(),
    });
  }
}
