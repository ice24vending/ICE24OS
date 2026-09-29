import { createHash, randomUUID } from "node:crypto";
import { authorize } from "@ice24/authorization";
import { subscriptionSchema, type Subscription, type SubscriptionView } from "@ice24/contracts";
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
import { IdentityStore } from "../../identity/identity.store.js";
import { getHeader, type SecurityRequest } from "../../../common/security/security-request.js";
import { subscriptionAccess } from "../domain/subscription.js";
import { writeLog } from "@ice24/observability";
import { SubscriptionPort, type SubscriptionUnitOfWork } from "../application/subscription.port.js";
import { provisionDemoEquipment } from "../../equipment/demo-provisioning.js";

export interface SubscriptionTransaction {
  client: PoolClient;
  actorId: string;
  accountId: string;
  contextId: string;
  correlationId: string;
  now: string;
}
// JSON projection is an explicit API allowlist, never an ORM/database row response.
const projection = `jsonb_build_object('id',id,'accountId',account_id,'provider',provider,
  'providerCustomerId',provider_customer_id,'providerSubscriptionId',provider_subscription_id,
  'planCode',plan_code,'price',jsonb_build_object('amountMinor',amount_minor,'currency',currency_code),
  'status',status,'currentPeriodStart',current_period_start,'currentPeriodEnd',current_period_end,
  'cancelAtPeriodEnd',cancel_at_period_end,'isDemo',is_demo,'demoExpiresAt',demo_expires_at,
  'version',row_version,'createdAt',created_at,'updatedAt',updated_at) as value`;

@Injectable()
export class SubscriptionDatabase extends SubscriptionPort implements OnModuleDestroy {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4,
    connectionTimeoutMillis: 5000,
  });
  constructor(@Inject(IdentityStore) private readonly identity: IdentityStore) {
    super();
  }
  async onModuleDestroy() {
    await this.pool.end();
  }

  override async run<T>(
    request: SecurityRequest,
    operation: string,
    body: unknown,
    admin: boolean,
    write: boolean,
    callback: (tx: SubscriptionUnitOfWork) => Promise<T>,
  ): Promise<T> {
    const actor = request.localUser,
      contextId = getHeader(request, "x-ice24-context-id");
    if (!actor || !contextId || !request.identityClaims) throw new ForbiddenException();
    const key = getHeader(request, "idempotency-key");
    if (write && (!key || key.length < 8 || key.length > 200))
      throw new BadRequestException("Idempotency-Key is required");
    const started = Date.now();
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query("set local statement_timeout='15s'");
      const locked = await client.query(
        `select c.id from identity.context_sessions c join identity.account_memberships m on m.id=c.membership_id
        join identity.accounts a on a.id=c.account_id join identity.users u on u.id=c.user_id
        where c.id=$1 and c.user_id=$2 and u.status='ACTIVE' for share of c,m,a,u`,
        [contextId, actor.id],
      );
      if (locked.rowCount !== 1) throw new ForbiddenException("Inactive identity context");
      const subject = await this.identity.getAuthorizationSubject(
        actor.id,
        contextId,
        request.identityClaims.aal,
      );
      const permission = admin ? "subscriptions.admin" : "subscriptions.read";
      if (
        !subject.accountWide ||
        !authorize(subject, {
          accountId: subject.membershipAccountId,
          permission,
          classification: admin ? "RESTRICTED" : "CONFIDENTIAL",
          operation: write ? "WRITE" : "READ",
          requiresMfa: admin,
        }).allowed
      )
        throw new ForbiddenException("Subscription operation not authorized");
      const now = (
        await client.query<{ now: Date }>("select now() as now")
      ).rows[0]!.now.toISOString();
      const tx = {
        client,
        actorId: actor.id,
        accountId: subject.membershipAccountId,
        contextId,
        correlationId: request.correlationId ?? randomUUID(),
        now,
      };
      const digest = createHash("sha256")
        .update(JSON.stringify([body, getHeader(request, "if-match")]))
        .digest("hex");
      if (write) {
        await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
          JSON.stringify([actor.id, tx.accountId, operation, key]),
        ]);
        const prior = (
          await client.query<{ digest: string; response: T }>(
            "select digest,response from subscriptions.idempotency where actor_id=$1 and context_account_id=$2 and operation=$3 and key=$4",
            [actor.id, tx.accountId, operation, key],
          )
        ).rows[0];
        if (prior) {
          if (prior.digest !== digest)
            throw new ConflictException("Idempotency key reused with different input");
          await client.query("commit");
          return prior.response;
        }
      }
      const result = await callback({
        accountId: tx.accountId,
        now: tx.now,
        read: (id, lock) => this.read(tx, id, lock),
        readDemo: (id) => this.readDemo(tx, id),
        save: (next, previous, event, reason) => this.save(tx, next, previous, event, reason),
        audit: async (id) =>
          (
            await client.query<{ audit: SubscriptionView["audit"] }>(
              "select jsonb_build_object('createdAt',created_at,'createdBy',created_by,'updatedAt',updated_at,'updatedBy',updated_by,'version',row_version) as audit from subscriptions.records where id=$1",
              [id],
            )
          ).rows[0]!.audit,
        access: async (id) =>
          (
            await client.query<{ mode: "ACTIVE" | "READ_ONLY" | "SUSPENDED" }>(
              "select subscriptions.effective_access(id,access_mode) as mode from identity.accounts where id=$1",
              [id],
            )
          ).rows[0]!.mode,
        createAccount: async (id, name, type, owner) => {
          await client.query("select identity.provision_subscription_account($1,$2,$3,$4)", [
            id,
            name,
            type,
            owner,
          ]);
        },
        seedDemo: async (id) => {
          await provisionDemoEquipment(client, id, now);
        },
        conversion: async (id) =>
          (
            await client.query<{ production_account_id: string }>(
              "select production_account_id from subscriptions.demo_conversions where demo_account_id=$1",
              [id],
            )
          ).rows[0]?.production_account_id,
        linkConversion: async (demo, production) => {
          await client.query(
            "insert into subscriptions.demo_conversions(demo_account_id,production_account_id) values($1,$2)",
            [demo, production],
          );
        },
      });
      if (write)
        await client.query(
          "insert into subscriptions.idempotency(actor_id,context_account_id,operation,key,digest,response) values($1,$2,$3,$4,$5,$6)",
          [actor.id, tx.accountId, operation, key, digest, JSON.stringify(result)],
        );
      await client.query("commit");
      writeLog({
        service: "api",
        environment: process.env.NODE_ENV ?? "development",
        module: "subscriptions",
        level: "info",
        outcome: "success",
        correlationId: tx.correlationId,
        durationMs: Date.now() - started,
        attributes: { event: operation.split(":").at(-1), write },
      });
      return result;
    } catch (error) {
      await client.query("rollback");
      const code =
        error !== null && typeof error === "object" && "code" in error ? error.code : undefined;
      if (["23505", "40001", "40P01"].includes(String(code)))
        throw new ConflictException("Concurrent operation; reload and retry");
      if (["23503", "23514", "22P02"].includes(String(code)))
        throw new BadRequestException("Invalid subscription input");
      throw error;
    } finally {
      client.release();
    }
  }

  async read(tx: SubscriptionTransaction, accountId: string, lock = false): Promise<Subscription> {
    // Lock the account before its subscription, matching authorization lock order.
    if (lock) await tx.client.query("select identity.lock_subscription_account($1)", [accountId]);
    const row = (
      await tx.client.query<{ value: unknown }>(
        `select ${projection} from subscriptions.records where account_id=$1 ${lock ? "for update" : ""}`,
        [accountId],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Subscription not found");
    return subscriptionSchema.parse(row.value);
  }
  async readDemo(tx: SubscriptionTransaction, id: string): Promise<Subscription> {
    const row = (
      await tx.client.query<{ account_id: string }>(
        "select account_id from subscriptions.records where id=$1 and is_demo",
        [id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Demo not found");
    return this.read(tx, row.account_id, true);
  }
  async save(
    tx: SubscriptionTransaction,
    next: Subscription,
    previous: Subscription | null,
    event: string,
    reason: string,
  ): Promise<void> {
    subscriptionSchema.parse(next);
    if (previous) {
      const result = await tx.client.query(
        `update subscriptions.records set provider_customer_id=$2,provider_subscription_id=$3,status=$4,
        current_period_start=$5,current_period_end=$6,cancel_at_period_end=$7,demo_expires_at=$8,row_version=$9,updated_at=$10,amount_minor=$12,updated_by=$13
        where id=$1 and row_version=$11`,
        [
          next.id,
          next.providerCustomerId,
          next.providerSubscriptionId,
          next.status,
          next.currentPeriodStart,
          next.currentPeriodEnd,
          next.cancelAtPeriodEnd,
          next.demoExpiresAt,
          next.version,
          tx.now,
          previous.version,
          next.price.amountMinor,
          tx.actorId,
        ],
      );
      if (result.rowCount !== 1) throw new ConflictException("Subscription version changed");
    } else {
      await tx.client.query(
        `insert into subscriptions.records(id,account_id,status,is_demo,demo_expires_at,created_at,updated_at,created_by,updated_by)
        values($1,$2,$3,$4,$5,$6,$6,$7,$7)`,
        [next.id, next.accountId, next.status, next.isDemo, next.demoExpiresAt, tx.now, tx.actorId],
      );
    }
    await tx.client.query("select identity.apply_subscription_access($1,$2)", [
      next.accountId,
      subscriptionAccess(next, tx.now),
    ]);
    await tx.client.query(
      `insert into subscriptions.events(subscription_id,account_id,actor_id,context_id,correlation_id,event_type,reason,previous_state,new_state)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        next.id,
        next.accountId,
        tx.actorId,
        tx.contextId,
        tx.correlationId,
        event,
        reason,
        previous ? JSON.stringify(previous) : null,
        JSON.stringify(next),
      ],
    );
  }
}
