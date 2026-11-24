import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { UserProfile, SessionSummary, MyActivity } from "@ice24/contracts";
import { IdentityController } from "../../apps/api/src/modules/identity/identity.controller.js";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import { SupabaseAdminClient } from "../../apps/api/src/modules/identity/supabase-admin.client.js";
import {
  AuthenticationGuard,
  TOKEN_VERIFIER,
} from "../../apps/api/src/common/security/authentication.guard.js";

describe("UXD-11 profile persistence, own activity and session isolation", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let identity: IdentityStore;
  let app: {
    listen(port: number, host: string): Promise<void>;
    getUrl(): Promise<string>;
    close(): Promise<void>;
  };
  let origin: string;
  const previousUrl = process.env.DATABASE_URL;
  const account = randomUUID();
  const otherAccount = randomUUID();
  const people = Object.fromEntries(
    ["owner", "other", "readonly", "support"].map((name) => [
      name,
      {
        id: randomUUID(),
        context: randomUUID(),
        membership: randomUUID(),
        name,
      },
    ]),
  );
  const provider = { hasVerifiedMfa: vi.fn(async (_subject: string) => true) };
  const person = (name: string) => people[name]!;
  const call = (name: string, path: string, init: RequestInit = {}) =>
    fetch(`${origin}/${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${name}`,
        "x-ice24-context-id": person(name).context,
        "content-type": "application/json",
        ...init.headers,
      },
    });
  const read = async (name = "owner") => (await (await call(name, "me")).json()) as UserProfile;
  const patch = (name: string, version: number, body: unknown) =>
    call(name, "me", {
      method: "PATCH",
      headers: { "if-match": `W/"${version}"` },
      body: JSON.stringify(body),
    });
  async function session(name: string) {
    const id = randomUUID();
    const p = person(name);
    await pool.query(
      `insert into identity.context_sessions(id,user_id,account_id,membership_id,device_summary,last_seen_at)
      values($1,$2,$3,$4,'Safari · iPhone',now()-interval '5 minutes')`,
      [id, p.id, account, p.membership],
    );
    return id;
  }
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await pool.query("create role anon;create role authenticated;create role service_role;");
    for (const file of [
      "20260829000100_phase3_identity.sql",
      "20260914000100_phase3_recovery_execution.sql",
      "20260917000100_phase4_equipment.sql",
      "20260924000100_phase5_subscriptions.sql",
      "20260929000100_phase5_checkout_intents.sql",
      "20260929000200_phase5_stripe_webhooks.sql",
      "20261002000100_phase5_audit.sql",
      "20261002000200_phase5_audit_producers.sql",
      "20261024000100_phase6_account_modules.sql",
      "20261124000100_uxd11_profile.sql",
    ])
      await pool.query(
        await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8"),
      );
    process.env.DATABASE_URL = container.getConnectionUri();
    identity = new IdentityStore();
    for (const id of [account, otherAccount])
      await pool.query(
        "insert into identity.accounts(id,name,account_type) values($1,'Cuenta de prueba','COMPANY')",
        [id],
      );
    for (const p of Object.values(people)) {
      await pool.query(
        "insert into identity.users(id,identity_subject,username,email,display_name,status) values($1,$2,$3,$4,$3,'ACTIVE')",
        [p.id, p.id, p.name, `${p.name}@example.test`],
      );
      await pool.query(
        "insert into identity.account_memberships(id,user_id,account_id,status) values($1,$2,$3,'ACTIVE')",
        [p.membership, p.id, account],
      );
      await pool.query(
        "insert into authz.membership_roles(membership_id,role_id) select $1,id from authz.roles where code=$2",
        [p.membership, p.name === "readonly" ? "AU" : p.name === "support" ? "IO" : "OW"],
      );
      await pool.query(
        "insert into authz.user_scopes(membership_id,scope_type) values($1,'ACCOUNT')",
        [p.membership],
      );
      await pool.query(
        "insert into identity.context_sessions(id,user_id,account_id,membership_id,device_summary) values($1,$2,$3,$4,'Chrome · Windows')",
        [p.context, p.id, account, p.membership],
      );
    }
    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const { Module } = apiRequire("@nestjs/common") as {
      Module(metadata: unknown): ClassDecorator;
    };
    const { NestFactory } = apiRequire("@nestjs/core") as {
      NestFactory: { create(module: unknown, options: unknown): Promise<typeof app> };
    };
    class ProfileTestModule {}
    Module({
      controllers: [IdentityController],
      providers: [
        AuthenticationGuard,
        { provide: IdentityStore, useValue: identity },
        { provide: SupabaseAdminClient, useValue: provider },
        {
          provide: TOKEN_VERIFIER,
          useValue: {
            verify: async (token: string) => {
              const p = people[token];
              if (!p) throw new Error("Invalid token");
              return {
                sub: p.id,
                email: `${p.name}@example.test`,
                name: "Nombre del proveedor",
                iss: "https://identity.example.test",
                aud: "authenticated",
                iat: 1,
                exp: 9999999999,
                aal: "aal2",
              };
            },
          },
        },
      ],
    })(ProfileTestModule);
    app = await NestFactory.create(ProfileTestModule, { logger: false });
    await app.listen(0, "127.0.0.1");
    origin = await app.getUrl();
  });
  afterAll(async () => {
    await app?.close();
    if (!app) await identity?.onModuleDestroy();
    await pool?.end();
    await container?.stop();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  });

  it("extends PATCH me, keeps the saved name through authentication and audits atomically", async () => {
    const before = await read();
    expect((await read()).version).toBe(before.version);
    const response = await patch("owner", before.version, {
      displayName: "Laura Méndez",
      phone: "+52 81 5550 2418",
      jobTitle: "Directora",
      locale: "es-MX",
      timeZone: "America/Cancun",
    });
    expect(response.status).toBe(200);
    const updated = (await response.json()) as UserProfile;
    expect(updated).toMatchObject({
      displayName: "Laura Méndez",
      phone: "+52 81 5550 2418",
      jobTitle: "Directora",
      version: before.version + 1,
    });
    expect(await read()).toEqual(updated);
    const events = (
      await pool.query(
        "select * from audit.events where actor_user_id=$1 and operation='identity.profile-update'",
        [person("owner").id],
      )
    ).rows;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      account_id: account,
      context_session_id: person("owner").context,
      ip_address: null,
      previous_values: { displayName: before.displayName },
      new_values: { displayName: "Laura Méndez", phone: "+52 81 5550 2418" },
    });
    expect((await patch("owner", before.version, { displayName: "Obsoleto" })).status).toBe(412);
    expect((await read()).displayName).toBe("Laura Méndez");
    expect((await patch("owner", updated.version, { email: "otro@example.test" })).status).toBe(
      400,
    );
    expect(
      (
        await call("owner", "me", {
          method: "PATCH",
          body: JSON.stringify({ displayName: "Sin versión" }),
        })
      ).status,
    ).toBe(400);
  });

  it("rolls the profile back when its audit cannot be inserted", async () => {
    const before = await read();
    await pool.query(`create function public.fail_profile_audit() returns trigger language plpgsql as $$ begin
      if new.operation='identity.profile-update' then raise exception 'simulated unavailable audit'; end if; return new; end $$;
      create trigger fail_profile_audit before insert on audit.events for each row execute function public.fail_profile_audit();`);
    try {
      expect((await patch("owner", before.version, { jobTitle: "No debe guardarse" })).status).toBe(
        500,
      );
      expect(await read()).toEqual(before);
    } finally {
      await pool.query(
        "drop trigger fail_profile_audit on audit.events; drop function public.fail_profile_audit();",
      );
    }
  });

  it("enforces profile-update while allowing granted identity self-service in read-only mode", async () => {
    expect(
      (await patch("support", (await read("support")).version, { displayName: "Sin permiso" }))
        .status,
    ).toBe(403);
    await pool.query("update identity.accounts set access_mode='READ_ONLY' where id=$1", [account]);
    try {
      expect(
        (await patch("readonly", (await read("readonly")).version, { jobTitle: "Auditor" })).status,
      ).toBe(200);
    } finally {
      await pool.query("update identity.accounts set access_mode='ACTIVE' where id=$1", [account]);
    }
  });

  it("returns the latest ten own actors only, including global events, regardless of supplied user filters", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 14; i++) {
      const own = i < 12;
      const id = randomUUID();
      if (own) ids.push(id);
      await pool.query(
        `insert into audit.events(id,occurred_at_utc,time_zone,actor_user_id,actor_type,account_id,entity_type,entity_id,operation,origin,result,correlation_id)
        values($1,now()+$2*interval '1 minute','America/Mexico_City',$3,'USER',$4,'identity.user',$5,'PROFILE_TEST','WEB','SUCCESS',$6)`,
        [
          id,
          i,
          person(own ? "owner" : "other").id,
          i === 11 ? null : i === 10 ? otherAccount : account,
          person("owner").id,
          randomUUID(),
        ],
      );
    }
    const response = await call(
      "owner",
      `me/activity?actorUserId=${person("other").id}&userId=${person("other").id}&limit=100`,
    );
    expect(response.status).toBe(200);
    const events = (await response.json()) as MyActivity[];
    expect(events.map((e) => e.id)).toEqual(ids.reverse().slice(0, 10));
    expect(Object.keys(events[0]!).sort()).toEqual(["id", "occurredAt", "operation", "result"]);
  });

  it("consults MFA only for the authenticated identity and exposes only status", async () => {
    provider.hasVerifiedMfa.mockClear();
    const response = await call("owner", `me/mfa?userId=${person("other").id}`);
    expect(await response.json()).toEqual({ enrolled: true, verified: true });
    expect(provider.hasVerifiedMfa).toHaveBeenCalledExactlyOnceWith(person("owner").id);
  });

  it("revokes one or all other sessions without If-Match, never another person's", async () => {
    const extra = await session("owner");
    const second = await session("owner");
    const sessions = (await (await call("owner", "me/sessions")).json()) as SessionSummary[];
    expect(sessions.some((s) => s.id === person("other").context)).toBe(false);
    expect(sessions.find((s) => s.id === extra)?.lastSeenAt).toBeTruthy();
    expect(
      (await call("owner", `me/sessions/${person("other").context}`, { method: "DELETE" })).status,
    ).toBe(404);
    expect((await call("owner", `me/sessions/${extra}`, { method: "DELETE" })).status).toBe(204);
    expect(
      (
        await call("owner", "me/sessions/revoke-all", {
          method: "POST",
          body: JSON.stringify({ excludeCurrent: true }),
        })
      ).status,
    ).toBe(204);
    const rows = (
      await pool.query(
        "select id,revoked_at from identity.context_sessions where id=any($1::uuid[])",
        [[person("owner").context, person("other").context, second]],
      )
    ).rows;
    expect(rows.find((r) => r.id === second).revoked_at).not.toBeNull();
    expect(rows.find((r) => r.id === person("owner").context).revoked_at).toBeNull();
    expect(rows.find((r) => r.id === person("other").context).revoked_at).toBeNull();
    const audits = (
      await pool.query(
        "select event_type,reason from audit.security_events where actor_user_id=$1",
        [person("owner").id],
      )
    ).rows;
    expect(audits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event_type: "SESSION_REVOKED" }),
        expect.objectContaining({ reason: "USER_REVOKED_OTHER_SESSIONS" }),
      ]),
    );
  });

  it("preserves global logout's default: no exclusion closes even the current session", async () => {
    await session("other");
    expect(
      (
        await call("other", "me/sessions/revoke-all", {
          method: "POST",
          body: JSON.stringify({ reason: "BFF_GLOBAL_LOGOUT" }),
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await pool.query(
          "select id from identity.context_sessions where user_id=$1 and revoked_at is null",
          [person("other").id],
        )
      ).rows,
    ).toEqual([]);
  });
});
