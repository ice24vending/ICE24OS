import {
  NOTIFICATION_PRIORITY_FILTER,
  notificationCursorSchema,
  notificationSummarySchema,
  toPublicNotification,
  type NotificationQuery,
} from "@ice24/contracts";
import { BadRequestException, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";
import {
  NotificationConditionOpenError,
  NotificationIdempotencyError,
  NotificationNotFoundError,
  NotificationResourceError,
  NotificationsPort,
  NotificationStateError,
  NotificationVersionError,
  type NotificationScope,
  type NotificationTransitionCommand,
} from "../application/notifications.port.js";

const iso = (column: string) =>
  `to_char(${column} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const PINNED = `(e.priority='CRITICAL' and r.acknowledged_at is null and r.status<>'RESOLVED')`;
// Explicit projection of the recipient's own row and its event; no origin payload exists.
const projection = `jsonb_build_object('id',r.id,'type',e.event_type,'priority',e.priority,
  'title',e.title,'message',e.message,'recipientUserId',r.user_id,'sourceType',e.source_type,
  'sourceId',e.source_id,'status',r.status,'action',e.action_required,
  'occurredAt',${iso("e.occurred_at")},'readAt',${iso("r.read_at")},
  'acknowledgedAt',${iso("r.acknowledged_at")},'inProgressAt',${iso("r.in_progress_at")},
  'resolvedAt',${iso("r.resolved_at")},'attentionResource',r.attention_resource,
  'resolutionResource',r.resolution_resource,
  'conditionOpen',case when r.status='RESOLVED' then false else notifications.condition_open(e.id) end,
  'channels',(select coalesce(jsonb_agg(distinct lower(a.channel)),'[]'::jsonb)
    from notifications.notification_delivery_attempts a
    where a.notification_recipient_id=r.id and a.status in ('SENT','DELIVERED')),
  'emailDelivery',(select jsonb_build_object('status',m.status,'updatedAt',${iso("m.updated_at")})
    from email.messages m where m.notification_recipient_id=r.id
    order by m.created_at desc, m.id desc limit 1),
  'createdAt',${iso("r.created_at")},'updatedAt',${iso("r.updated_at")},
  'updatedBy',r.updated_by,'rowVersion',r.row_version)`;
const FROM = `from notifications.notification_recipients r
  join notifications.notification_events e on e.id=r.notification_event_id`;

export function notificationsWhere(scope: NotificationScope, query: Partial<NotificationQuery>) {
  const values: unknown[] = [scope.accountId, scope.userId];
  const clauses = ["r.account_id=$1::uuid", "r.user_id=$2::uuid"];
  const bind = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (query.status) clauses.push(`r.status=${bind(query.status.toUpperCase())}`);
  if (query.priority)
    clauses.push(
      `e.priority=any(${bind([...NOTIFICATION_PRIORITY_FILTER[query.priority]])}::text[])`,
    );
  if (query.type) clauses.push(`e.event_type=${bind(query.type)}`);
  if (query.pinned !== undefined) clauses.push(`${PINNED}=${bind(query.pinned)}::boolean`);
  if (query.unacknowledged !== undefined)
    clauses.push(
      query.unacknowledged ? "r.status in ('UNREAD','READ')" : "r.status not in ('UNREAD','READ')",
    );
  if (query.cursor) {
    let cursor: unknown;
    try {
      cursor = JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8"));
    } catch {
      throw new BadRequestException("Invalid notification cursor");
    }
    const decoded = notificationCursorSchema.safeParse(cursor);
    if (!decoded.success) throw new BadRequestException("Invalid notification cursor");
    clauses.push(
      `(r.created_at,r.id)<(${bind(decoded.data[0])}::timestamptz,${bind(decoded.data[1])}::uuid)`,
    );
  }
  return { values, where: clauses.join(" and ") };
}

@Injectable()
export class NotificationsDatabase extends NotificationsPort implements OnModuleDestroy {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  });
  async onModuleDestroy() {
    await this.pool.end();
  }

  override async list(scope: NotificationScope, query: NotificationQuery) {
    const { values, where } = notificationsWhere(scope, query);
    values.push(query.limit + 1);
    const result = await this.pool.query<{ value: unknown; cursor_time: string; id: string }>(
      `select ${projection} as value, r.id, ${iso("r.created_at")} as cursor_time
       ${FROM} where ${where} order by r.created_at desc, r.id desc limit $${values.length}`,
      values,
    );
    const hasMore = result.rows.length > query.limit;
    const rows = result.rows.slice(0, query.limit);
    const last = rows.at(-1);
    return {
      items: rows.map((row) => toPublicNotification(row.value)),
      page: {
        hasMore,
        nextCursor:
          hasMore && last
            ? Buffer.from(JSON.stringify([last.cursor_time, last.id])).toString("base64url")
            : null,
      },
    };
  }

  override async get(scope: NotificationScope, id: string) {
    const { values, where } = notificationsWhere(scope, {});
    values.push(id);
    const result = await this.pool.query<{ value: unknown }>(
      `select ${projection} as value ${FROM} where ${where} and r.id=$${values.length}::uuid`,
      values,
    );
    return result.rows[0] ? toPublicNotification(result.rows[0].value) : null;
  }

  override async summary(scope: NotificationScope) {
    const result = await this.pool.query<Record<string, string>>(
      `select count(*) filter (where r.status='UNREAD' or ${PINNED}) as badge,
         count(*) filter (where r.status='UNREAD') as unread,
         count(*) filter (where ${PINNED}) as pinned,
         count(*) filter (where r.status='ACKNOWLEDGED') as acknowledged,
         count(*) filter (where r.status='IN_PROGRESS') as in_progress,
         count(*) filter (where r.status='RESOLVED') as resolved
       ${FROM} where r.account_id=$1::uuid and r.user_id=$2::uuid`,
      [scope.accountId, scope.userId],
    );
    const row = result.rows[0] ?? {};
    return notificationSummarySchema.parse({
      badge: Number(row.badge ?? 0),
      unread: Number(row.unread ?? 0),
      pinned: Number(row.pinned ?? 0),
      acknowledged: Number(row.acknowledged ?? 0),
      inProgress: Number(row.in_progress ?? 0),
      resolved: Number(row.resolved ?? 0),
    });
  }

  override async transition(
    scope: NotificationScope,
    id: string,
    command: NotificationTransitionCommand,
  ) {
    try {
      await this.pool.query(
        "select notifications.transition_expected($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          id,
          scope.accountId,
          scope.userId,
          scope.contextSessionId,
          command.action,
          command.resource ? JSON.stringify(command.resource) : null,
          command.idempotencyKey,
          scope.correlationId,
          command.expectedVersion,
        ],
      );
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "IC404") throw new NotificationNotFoundError();
      if (code === "IC409") throw new NotificationStateError();
      if (code === "IC428") throw new NotificationConditionOpenError();
      if (code === "IC412") throw new NotificationIdempotencyError();
      if (code === "22023") throw new NotificationResourceError();
      if (code === "ICVER") throw new NotificationVersionError();
      throw error;
    }
    const notification = await this.get(scope, id);
    if (!notification) throw new NotificationNotFoundError();
    return notification;
  }
}
