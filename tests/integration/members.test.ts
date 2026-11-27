import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { accountMemberDetailSchema, accountMemberSchema } from "@ice24/contracts";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import { EquipmentDatabase } from "../../apps/api/src/modules/equipment/equipment.database.js";
import { MembersStore } from "../../apps/api/src/modules/equipment/members.store.js";
import type { SupabaseAdminClient } from "../../apps/api/src/modules/identity/supabase-admin.client.js";
import type { SecurityRequest } from "../../apps/api/src/common/security/security-request.js";

/** UXD-09: «Usuarios» list and detail, invitation data and the last active Owner rule. */
describe("UXD-09 account members", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let identity: IdentityStore;
  let db: EquipmentDatabase;
  let members: MembersStore;
  const oldUrl = process.env.DATABASE_URL;
  const actors = new Map<
    string,
    { user: string; context: string; account: string; membership: string }
  >();
  const auth = { inviteUser: async () => undefined } as unknown as SupabaseAdminClient;
  function req(name: string, version = 1): SecurityRequest {
    const actor = actors.get(name)!;
    return {
      headers: {
        "x-ice24-context-id": actor.context,
        "idempotency-key": randomUUID(),
        "if-match": String(version),
      },
      correlationId: randomUUID(),
      localUser: {
        id: actor.user,
        identitySubject: actor.user,
        username: name,
        email: `${name}@example.test`,
        displayName: name,
        locale: "es-MX",
        timeZone: "America/Mexico_City",
        status: "ACTIVE",
        version: 1,
      },
      identityClaims: {
        sub: actor.user,
        email: `${name}@example.test`,
        iss: "https://local.test",
        aud: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        aal: "aal2",
      },
    };
  }
  async function addActor(name: string, account: string, role: string) {
    const user = randomUUID(),
      membership = randomUUID(),
      context = randomUUID();
    actors.set(name, { user, context, account, membership });
    await pool.query(
      "insert into identity.users(id,identity_subject,username,email,display_name,status) values($1::uuid,$1::text,$2,$3,$2,'ACTIVE')",
      [user, name, `${name}@example.test`],
    );
    await pool.query(
      "insert into identity.account_memberships(id,account_id,user_id,status) values($1,$2,$3,'ACTIVE')",
      [membership, account, user],
    );
    await pool.query(
      "insert into authz.membership_roles(membership_id,role_id) select $1,id from authz.roles where code=$2",
      [membership, role],
    );
    await pool.query(
      "insert into authz.user_scopes(membership_id,scope_type) values($1,'ACCOUNT')",
      [membership],
    );
    await pool.query(
      "insert into identity.context_sessions(id,user_id,account_id,membership_id) values($1,$2,$3,$4)",
      [context, user, account, membership],
    );
  }
  async function account(name: string) {
    const id = randomUUID();
    await pool.query(
      "insert into identity.accounts(id,name,account_type,details) values($1,$2,'COMPANY',$3)",
      [id, name, JSON.stringify({ timezone: "America/Tijuana" })],
    );
    return id;
  }
  const activeOwners = async (accountId: string) =>
    (
      await pool.query(
        `select count(*)::int as n from identity.account_memberships m
        join authz.membership_roles mr on mr.membership_id=m.id and mr.valid_to is null
        join authz.roles r on r.id=mr.role_id and r.code='OW'
        where m.account_id=$1 and m.status='ACTIVE'`,
        [accountId],
      )
    ).rows[0].n as number;
  const version = async (name: string) =>
    Number(
      (
        await pool.query("select row_version from identity.account_memberships where id=$1", [
          actors.get(name)!.membership,
        ])
      ).rows[0].row_version,
    );
  const suspend = async (name: string, actor: string) =>
    identity.transitionMembership({
      actorUserId: actors.get(actor)!.user,
      actorAccountId: actors.get(name)!.account,
      membershipId: actors.get(name)!.membership,
      targetStatus: "SUSPENDED",
      expectedVersion: await version(name),
      reason: "Prueba de integración UXD-09",
      correlationId: randomUUID(),
    });
  const demote = async (name: string, actor: string) =>
    members.permissions(req(actor, await version(name)), actors.get(name)!.membership, {
      roleCodes: ["AU"],
      branchIds: [],
      machineIds: [],
      reason: "Prueba de integración UXD-09",
      overrides: [],
    });
  /** Same shape the browser receives: dates arrive as ISO strings. */
  const wire = (value: unknown): unknown => JSON.parse(JSON.stringify(value));
  const lastOwner = (error: unknown) =>
    (error as { getStatus?: () => number }).getStatus?.() === 409 &&
    JSON.stringify((error as { getResponse(): unknown }).getResponse()).includes("last_owner");

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await pool.query("create role anon;create role authenticated;create role service_role;");
    await pool.query(
      await readFile(new URL("./support/pgmq-emulation.sql", import.meta.url), "utf8"),
    );
    await pool.query(
      (
        await readFile(
          new URL("../../supabase/migrations/20260825000100_phase2_platform.sql", import.meta.url),
          "utf8",
        )
      ).replace(/create extension if not exists (pgmq|pg_cron);/gu, ""),
    );
    for (const file of [
      "20260829000100_phase3_identity.sql",
      "20260914000100_phase3_recovery_execution.sql",
      "20260917000100_phase4_equipment.sql",
      "20260924000100_phase5_subscriptions.sql",
      "20260929000100_phase5_checkout_intents.sql",
      "20260929000200_phase5_stripe_webhooks.sql",
      "20261002000100_phase5_audit.sql",
      "20261002000200_phase5_audit_producers.sql",
      "20261003000100_phase5_outbox.sql",
      "20261003000200_phase5_outbox_publisher.sql",
      "20261003000300_phase5_consumers.sql",
      "20261003000400_phase5_jobs.sql",
      "20261003000500_phase5_files.sql",
      "20261003000600_phase5_file_scans.sql",
      "20261009000100_phase4_account_catalog.sql",
      "20261010000100_phase4_machine_components.sql",
      "20261123000100_uxd04_machine_component_details.sql",
      "20261011000100_phase4_frequency_overrides.sql",
      "20261012000100_phase4_schedule_recalc.sql",
      "20261024000100_phase6_account_modules.sql",
      "20261102000100_phase7_scheduling.sql",
      "20261102000200_phase7_tickets.sql",
      "20261103000100_phase7_work_orders.sql",
      "20261104000100_phase7_execution_reviews.sql",
      "20261121000100_uxd02_branch_details.sql",
      "20261124000100_uxd11_profile.sql",
    ])
      await pool.query(
        await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8"),
      );
    process.env.DATABASE_URL = container.getConnectionUri();
    identity = new IdentityStore();
    db = new EquipmentDatabase(identity);
    members = new MembersStore(db, auth);
    const main = await account("Principal");
    await addActor("owner", main, "OW");
    await addActor("reader", main, "AU");
    await addActor("pairA", main, "OW");
    await addActor("pairB", main, "OW");
    await addActor("outsider", await account("Otra cuenta"), "OW");
  }, 180_000);
  afterAll(async () => {
    await db?.onModuleDestroy();
    await identity?.onModuleDestroy();
    await pool?.end();
    await container?.stop();
    process.env.DATABASE_URL = oldUrl;
  });

  it("lists memberships with scope, contact data and last access", async () => {
    const rows = accountMemberSchema.array().parse(wire(await members.list(req("owner"))));
    const reader = rows.find((row) => row.email === "reader@example.test")!;
    expect(reader).toMatchObject({ roles: ["AU"], account_wide: true, status: "ACTIVE" });
    expect(reader.last_access_at).not.toBeNull();
  });

  it("stores phone and job title only for a new identity and never overwrites one", async () => {
    await members.invite(req("owner"), {
      email: "nueva@example.test",
      displayName: "Persona nueva",
      // Not TC: an Owner cannot delegate maintenance.orders-execute (TC-only grant since F7).
      roleCodes: ["AU"],
      branchIds: [],
      machineIds: [],
      phone: "+52 55 1234 5678",
      jobTitle: "Técnica de campo",
    });
    await members.invite(req("owner"), {
      email: "outsider@example.test",
      displayName: "Otro nombre",
      roleCodes: ["AU"],
      branchIds: [],
      machineIds: [],
      phone: "+52 55 0000 0000",
      jobTitle: "No debe guardarse",
    });
    const users = (
      await pool.query(
        "select lower(email) as email,display_name,phone,job_title from identity.users where lower(email) in ('nueva@example.test','outsider@example.test') order by 1",
      )
    ).rows;
    expect(users).toEqual([
      {
        email: "nueva@example.test",
        display_name: "Persona nueva",
        phone: "+52 55 1234 5678",
        job_title: "Técnica de campo",
      },
      { email: "outsider@example.test", display_name: "outsider", phone: null, job_title: null },
    ]);
  });

  it("counts activity in rolling windows of the account's time zone", async () => {
    const owner = actors.get("owner")!;
    for (const [operation, daysAgo] of [
      ["TicketCreated", 0],
      ["TicketCreated", 3],
      ["TicketCreated", 20],
      ["TicketDiagnosed", 3],
    ] as const)
      await pool.query(
        `insert into audit.events(occurred_at_utc,time_zone,actor_user_id,actor_type,account_id,entity_type,entity_id,operation,origin,result,correlation_id)
        values(now()-make_interval(days=>$1),'America/Tijuana',$2,'USER',$3,'maintenance_ticket',$4,$5,'API','SUCCESS',$4)`,
        [daysAgo, owner.user, owner.account, randomUUID(), operation],
      );
    const read = async (period: string) =>
      accountMemberDetailSchema.parse(
        wire(await members.detail(req("owner"), owner.membership, period)),
      ).activity;
    const [day, week, month] = [await read("day"), await read("week"), await read("month")];
    expect([day.ticketsCreated, week.ticketsCreated, month.ticketsCreated]).toEqual([1, 2, 3]);
    expect([day.ticketsAttended, week.ticketsAttended]).toEqual([0, 1]);
    expect(week.timeZone).toBe("America/Tijuana");
    // The window starts at local midnight six days before today.
    const start = new Date(week.from);
    const local = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Tijuana",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(start);
    expect(local).toBe("00:00");
    expect(Date.now() - start.getTime()).toBeGreaterThan(6 * 86_400_000);
    expect(Date.now() - start.getTime()).toBeLessThanOrEqual(7 * 86_400_000);
    await expect(members.detail(req("reader"), owner.membership, "week")).rejects.toThrow();
  });

  it("refuses to demote or suspend the only active Owner", async () => {
    // owner, pairA and pairB share the main account; leave only "owner" before the checks.
    await suspend("pairA", "owner");
    await suspend("pairB", "owner");
    expect(await activeOwners(actors.get("owner")!.account)).toBe(1);
    const detail = accountMemberDetailSchema.parse(
      wire(await members.detail(req("owner"), actors.get("owner")!.membership, "week")),
    );
    expect(detail.lastActiveOwner).toBe(true);
    expect(detail.self).toBe(true);
    await expect(suspend("owner", "reader")).rejects.toSatisfy(lastOwner);
    await identity.transitionMembership({
      actorUserId: actors.get("owner")!.user,
      actorAccountId: actors.get("owner")!.account,
      membershipId: actors.get("pairA")!.membership,
      targetStatus: "ACTIVE",
      expectedVersion: await version("pairA"),
      reason: "Reactivación de prueba UXD-09",
      correlationId: randomUUID(),
    });
  });

  it("never leaves the account without an Owner under concurrent changes", async () => {
    const accountId = actors.get("owner")!.account;
    // Force the overlap: both changes stop at their audit insert, after the Owner count and
    // before commit, until this gate opens. Without the lock both counts would see two Owners.
    async function race<T>(changes: (() => Promise<T>)[]) {
      const gate = await pool.connect();
      try {
        await gate.query("begin; lock table audit.security_events, equipment.events in share mode");
        const settled = Promise.allSettled(changes.map((change) => change()));
        await new Promise((resolve) => setTimeout(resolve, 500));
        await gate.query("commit");
        return await settled;
      } finally {
        gate.release();
      }
    }
    // Two Owners (owner, pairA): two simultaneous suspensions.
    const suspensions = await race([
      () => suspend("owner", "pairA"),
      () => suspend("pairA", "owner"),
    ]);
    expect(suspensions.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const refused = suspensions.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(lastOwner(refused.reason)).toBe(true);
    expect(await activeOwners(accountId)).toBe(1);

    // Back to two Owners, then a role change and a suspension at the same time.
    // The first promise suspended "owner" when it won, so "pairA" kept the role.
    const [kept, other] =
      suspensions[0]!.status === "fulfilled" ? ["pairA", "owner"] : ["owner", "pairA"];
    await identity.transitionMembership({
      actorUserId: actors.get(kept)!.user,
      actorAccountId: accountId,
      membershipId: actors.get(other)!.membership,
      targetStatus: "ACTIVE",
      expectedVersion: await version(other),
      reason: "Reactivación de prueba UXD-09",
      correlationId: randomUUID(),
    });
    expect(await activeOwners(accountId)).toBe(2);
    const mixed = await race([() => demote(other, kept), () => suspend(kept, other)]);
    expect(mixed.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await activeOwners(accountId)).toBe(1);
  });
});
