import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import pg from "pg";

// A new database per run prevents tests from changing the user's manual fixtures.
// This is an HTTP/PostgreSQL laboratory, not evidence of real Supabase login or MFA.
const run = `qa_phase3_${Date.now()}`;
const output = process.argv[2] ?? `tmp/${run}.json`;
const connection = "postgresql://postgres:postgres@127.0.0.1:54322/";
const admin = new pg.Client({
  connectionString: `${connection}postgres`,
  connectionTimeoutMillis: 3000,
});
const results = [];
let db, app, issuerServer;
const started = new Date().toISOString();
const check = async (id, name, fn) => {
  try {
    await fn();
    results.push({ id, name, status: "APROBADO" });
  } catch (error) {
    results.push({ id, name, status: "FALLIDO", error: error.message });
  }
};
try {
  await admin.connect();
  assert.match(run, /^qa_phase3_[0-9]+$/);
  await admin.query(`create database ${run}`);
  db = new pg.Client({ connectionString: `${connection}${run}` });
  await db.connect();
  await db.query("create schema extensions");
  await db.query(await readFile("supabase/migrations/20260829000100_phase3_identity.sql", "utf8"));
  await db.query(
    await readFile("supabase/migrations/20260914000100_phase3_recovery_execution.sql", "utf8"),
  );
  await check("ENV-09", "pgTAP identidad: 18 comprobaciones en base aislada", async () => {
    const batches = await db.query(
      await readFile("supabase/tests/database/phase3_identity_test.sql", "utf8"),
    );
    const lines = batches
      .flatMap((b) => b.rows.flatMap((r) => Object.values(r)))
      .filter((x) => typeof x === "string");
    assert.ok(lines.includes("1..18"));
    assert.equal(lines.filter((x) => /^ok \d+/.test(x)).length, 18);
    assert.ok(!lines.some((x) => /^not ok/.test(x)));
  });
  const key = generateKeyPairSync("rsa", { modulusLength: 2048 });
  let issuer;
  issuerServer = createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify(
        req.url.endsWith("openid-configuration")
          ? { issuer, jwks_uri: `${issuer}/keys` }
          : { keys: [{ ...key.publicKey.export({ format: "jwk" }), kid: "qa-key", alg: "RS256" }] },
      ),
    );
  });
  await new Promise((resolve) => issuerServer.listen(0, "127.0.0.1", resolve));
  issuer = `http://127.0.0.1:${issuerServer.address().port}`;
  process.env.DATABASE_URL = `${connection}${run}`;
  process.env.OIDC_ISSUER = issuer;
  process.env.OIDC_AUDIENCE = "authenticated";
  process.env.NODE_ENV = "test";
  const requireApi = createRequire(new URL("../../apps/api/package.json", import.meta.url));
  requireApi("reflect-metadata");
  const { NestFactory } = requireApi("@nestjs/core");
  const { AppModule } = await import("../../apps/api/dist/platform/app.module.js");
  const { SupabaseAdminClient } =
    await import("../../apps/api/dist/modules/identity/supabase-admin.client.js");
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("v1");
  await app.listen(0, "127.0.0.1");
  const issuedRecoveries = [];
  app.get(SupabaseAdminClient).issueControlledRecovery = async (target) => {
    issuedRecoveries.push(target);
  };
  const base = `${await app.getUrl()}/v1`;
  const users = {};
  const accounts = {};
  for (const name of ["A", "B"]) {
    accounts[name] = randomUUID();
    await db.query("insert into identity.accounts(id,name,account_type) values($1,$2,'COMPANY')", [
      accounts[name],
      `QA ${name}`,
    ]);
  }
  for (const name of ["a", "b", "multi", "read", "op1", "op2", "target", "extra"]) {
    users[name] = { id: randomUUID(), sub: randomUUID(), email: `${name}@qa.example.test` };
    const u = users[name];
    await db.query(
      "insert into identity.users(id,identity_subject,username,email,display_name,status) values($1,$2,$3,$4,$3,'ACTIVE')",
      [u.id, u.sub, name.padEnd(3, "x"), u.email],
    );
  }
  const memberships = {};
  for (const [u, a, role] of [
    ["a", "A", "OW"],
    ["b", "B", "OW"],
    ["multi", "A", "OW"],
    ["multi", "B", "OW"],
    ["read", "A", "AU"],
    ["op1", "A", "IO"],
    ["op2", "A", "IO"],
    ["target", "A", "IO"],
  ]) {
    const id = randomUUID();
    memberships[`${u}${a}`] = id;
    await db.query(
      "insert into identity.account_memberships(id,user_id,account_id,status) values($1,$2,$3,'ACTIVE')",
      [id, users[u].id, accounts[a]],
    );
    await db.query(
      "insert into authz.membership_roles(membership_id,role_id) select $1,id from authz.roles where code=$2",
      [id, role],
    );
    await db.query("insert into authz.user_scopes(membership_id,scope_type) values($1,'ACCOUNT')", [
      id,
    ]);
  }
  const token = (user, overrides = {}, header = {}) => {
    const encode = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const raw = `${encode({ alg: "RS256", kid: "qa-key", ...header })}.${encode({ sub: users[user].sub, email: users[user].email, iss: issuer, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 300, aal: "aal2", session_id: `qa-${user}`, ...overrides })}`;
    return `${raw}.${sign("RSA-SHA256", Buffer.from(raw), key.privateKey).toString("base64url")}`;
  };
  const request = async (user, path, method = "GET", body, ctx, overrideToken) => {
    const response = await fetch(`${base}/${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(user ? { authorization: `Bearer ${overrideToken ?? token(user)}` } : {}),
        ...(ctx ? { "x-ice24-context-id": ctx } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  const activate = async (u, a, session = `qa-${u}`) => {
    const r = await request(
      u,
      "session-contexts",
      "POST",
      { accountId: accounts[a] },
      undefined,
      token(u, { session_id: session }),
    );
    assert.equal(r.status, 201, JSON.stringify(r));
    return r.body.id;
  };
  const mutation = (account, user = "extra", roles = ["AU"]) => ({
    accountId: accounts[account],
    userId: users[user].id,
    roleCodes: roles,
  });
  const baseline = await request("a", "me");
  assert.equal(baseline.status, 200);
  await check("SEC-01", "Sin token y token malformado; control positivo", async () => {
    assert.equal(
      (await fetch(`${base}/me`, { headers: { authorization: "Basic invalid" } })).status,
      401,
    );
    assert.equal((await request(null, "me")).status, 401);
    assert.equal((await request("a", "me", "GET", undefined, undefined, "invalid")).status, 401);
    assert.equal((await request("a", "me")).status, 200);
    assert.deepEqual((await request(null, "me")).body, {
      message: "Authentication required",
      error: "Unauthorized",
      statusCode: 401,
    });
  });
  await check("SEC-02", "Firma alterada y alg none/HS256", async () => {
    const before = (
      await db.query(
        "select (select count(*) from identity.users) as users,(select count(*) from identity.context_sessions) as sessions",
      )
    ).rows;
    const t = token("a").split(".");
    t[2] = `${t[2][0] === "A" ? "B" : "A"}${t[2].slice(1)}`;
    for (const invalid of [
      t.join("."),
      token("a", {}, { alg: "none" }),
      token("a", {}, { alg: "HS256" }),
    ])
      assert.equal((await request("a", "me", "GET", undefined, undefined, invalid)).status, 401);
    assert.deepEqual(
      (
        await db.query(
          "select (select count(*) from identity.users) as users,(select count(*) from identity.context_sessions) as sessions",
        )
      ).rows,
      before,
    );
  });
  for (const [id, variants] of [
    ["SEC-03", [{ exp: 1 }]],
    ["SEC-04", [{ iss: "https://invalid.example.test" }]],
    ["SEC-05", [{ aud: "wrong" }, { aud: ["wrong"] }]],
  ]) {
    await check(id, "Claims con firma válida; variantes aisladas", async () => {
      for (const claims of variants)
        assert.equal(
          (await request("a", "me", "GET", undefined, undefined, token("a", claims))).status,
          401,
        );
      assert.equal(
        (
          await request(
            "a",
            "me",
            "GET",
            undefined,
            undefined,
            token("a", { aud: ["authenticated"] }),
          )
        ).status,
        200,
      );
    });
  }
  await check(
    "TEN-01",
    "API lista exclusivamente la cuenta propia (complemento de UI)",
    async () => {
      for (const [u, a] of [
        ["a", "A"],
        ["b", "B"],
      ]) {
        const r = await request(u, "me/contexts");
        assert.equal(r.status, 200);
        assert.deepEqual(
          r.body.map((c) => c.accountId),
          [accounts[a]],
        );
      }
    },
  );
  await check("TEN-02", "Activación propia y cruce A/B sin efectos", async () => {
    for (const [u, own, foreign] of [
      ["a", "A", "B"],
      ["b", "B", "A"],
    ]) {
      await activate(u, own);
      const before = (await db.query("select count(*) from identity.context_sessions")).rows[0]
        .count;
      const r = await request(u, "session-contexts", "POST", { accountId: accounts[foreign] });
      assert.ok([403, 404].includes(r.status), `HTTP ${r.status}`);
      assert.equal(
        (await db.query("select count(*) from identity.context_sessions")).rows[0].count,
        before,
      );
    }
  });
  await check("TEN-03", "Modificar membresía ajena A/B", async () => {
    for (const [u, own, other] of [
      ["a", "A", "multiB"],
      ["b", "B", "multiA"],
    ]) {
      const ctx = await activate(u, own);
      const r = await request(
        u,
        `user-associations/${memberships[other]}/suspend`,
        "POST",
        { expectedVersion: 1, reason: "QA cross tenant attempt" },
        ctx,
      );
      assert.ok([403, 404].includes(r.status), `HTTP ${r.status}`);
      assert.equal(
        (
          await db.query("select status from identity.account_memberships where id=$1", [
            memberships[other],
          ])
        ).rows[0].status,
        "ACTIVE",
      );
    }
  });
  await check("TEN-04", "Crear asociación en cuenta ajena", async () => {
    for (const [u, own, other] of [
      ["a", "A", "B"],
      ["b", "B", "A"],
    ]) {
      const ctx = await activate(u, own);
      assert.equal(
        (await request(u, "user-associations", "POST", mutation(other), ctx)).status,
        404,
      );
    }
    assert.equal(
      (
        await db.query("select count(*) from identity.account_memberships where user_id=$1", [
          users.extra.id,
        ])
      ).rows[0].count,
      "0",
    );
  });
  await check("TEN-05", "Contexto ajeno con identidad válida", async () => {
    const b = await activate("b", "B");
    assert.equal((await request("a", "session-contexts/current", "GET", undefined, b)).status, 404);
    assert.equal((await request("a", "user-associations", "POST", mutation("B"), b)).status, 404);
  });
  await check("TEN-06", "Conmutación multi-cuenta API y revocación contexto anterior", async () => {
    const a = await activate("multi", "A");
    const b = await activate("multi", "B");
    assert.equal(
      (await request("multi", "session-contexts/current", "GET", undefined, a)).status,
      404,
    );
    assert.equal(
      (await request("multi", "session-contexts/current", "GET", undefined, b)).body.accountId,
      accounts.B,
    );
  });
  await check("TEN-07", "Consulta lee, escritura denegada con MFA de laboratorio", async () => {
    const ctx = await activate("read", "A");
    assert.equal(
      (await request("read", "session-contexts/current", "GET", undefined, ctx)).status,
      200,
    );
    assert.equal(
      (await request("read", "user-associations", "POST", mutation("A"), ctx)).status,
      403,
    );
  });
  await check("TEN-09", "Suspensión invalida contexto activo", async () => {
    const ctx = await activate("multi", "A");
    const owner = await activate("a", "A");
    const r = await request(
      "a",
      `user-associations/${memberships.multiA}/suspend`,
      "POST",
      { expectedVersion: 1, reason: "QA suspend active membership" },
      owner,
    );
    assert.equal(r.status, 201);
    assert.equal(
      (await request("multi", "session-contexts/current", "GET", undefined, ctx)).status,
      404,
    );
    assert.ok(
      [403, 404].includes(
        (await request("multi", "session-contexts", "POST", { accountId: accounts.A })).status,
      ),
    );
  });
  await check("TEN-11", "Solo lectura bloquea escritura y conserva lectura", async () => {
    const ctx = await activate("b", "B");
    await db.query("update identity.accounts set access_mode='READ_ONLY' where id=$1", [
      accounts.B,
    ]);
    try {
      assert.equal(
        (await request("b", "session-contexts/current", "GET", undefined, ctx)).status,
        200,
      );
      assert.equal(
        (await request("b", "user-associations", "POST", mutation("B"), ctx)).status,
        403,
      );
    } finally {
      await db.query("update identity.accounts set access_mode='ACTIVE' where id=$1", [accounts.B]);
    }
  });
  await check("TEN-13", "Propietario no puede conceder roles de plataforma", async () => {
    const ctx = await activate("a", "A");
    const r = await request("a", "user-associations", "POST", mutation("A", "extra", ["IA"]), ctx);
    assert.equal(r.status, 403);
  });
  await check(
    "SES-01",
    "Revocación individual; cliente independiente conserva acceso",
    async () => {
      const a = await activate("b", "B", "client-1");
      const b = await activate("b", "B", "client-2");
      assert.equal((await request("b", `me/sessions/${a}`, "DELETE")).status, 204);
      assert.equal(
        (await request("b", "session-contexts/current", "GET", undefined, a)).status,
        404,
      );
      assert.equal(
        (await request("b", "session-contexts/current", "GET", undefined, b)).status,
        200,
      );
    },
  );
  await check("SES-02", "Revocación de sesión ajena rechazada", async () => {
    const b = await activate("b", "B");
    assert.equal((await request("a", `me/sessions/${b}`, "DELETE")).status, 404);
    assert.equal((await request("b", "session-contexts/current", "GET", undefined, b)).status, 200);
  });
  await check("SES-04", "Revocación de todos los contextos por API", async () => {
    const a = await activate("b", "B", "client-1");
    const b = await activate("b", "B", "client-2");
    assert.equal(
      (await request("b", "me/sessions/revoke-all", "POST", { reason: "QA global local contexts" }))
        .status,
      204,
    );
    for (const ctx of [a, b])
      assert.equal(
        (await request("b", "session-contexts/current", "GET", undefined, ctx)).status,
        404,
      );
  });
  await check("SES-11", "Cierre contextual genera CONTEXT_REVOKED", async () => {
    const ctx = await activate("b", "B");
    assert.equal(
      (await request("b", "session-contexts/current", "DELETE", undefined, ctx)).status,
      204,
    );
    assert.equal(
      (
        await db.query(
          "select count(*) from audit.security_events where context_session_id=$1 and event_type='CONTEXT_REVOKED'",
          [ctx],
        )
      ).rows[0].count,
      "1",
    );
  });
  await check("SEC-14", "No se acepta identitySessionId falsificado", async () => {
    const r = await request("a", "session-contexts", "POST", {
      accountId: accounts.A,
      identitySessionId: "forged",
    });
    assert.equal(r.status, 400);
  });
  await check("TEN-15", "Acceso directo anon/authenticated denegado", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.query("begin");
      await db.query(`set local role ${role}`);
      try {
        await assert.rejects(
          db.query("select * from identity.accounts"),
          (e) => e.code === "42501",
        );
      } finally {
        await db.query("rollback");
      }
    }
  });
  await check("TEN-15", "Escritura directa anon/authenticated denegada", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.query("begin");
      await db.query(`set local role ${role}`);
      try {
        await assert.rejects(
          db.query("update identity.accounts set name='forbidden'"),
          (e) => e.code === "42501",
        );
      } finally {
        await db.query("rollback");
      }
    }
  });
  await check(
    "SEC-12",
    "Auditoría y revocación atómicas cuando falla INSERT de evento",
    async () => {
      const ctx = await activate("b", "B");
      await db.query(
        "create function audit.qa_fail() returns trigger language plpgsql as $$begin raise exception 'QA injected failure'; end$$",
      );
      await db.query(
        "create trigger qa_fail before insert on audit.security_events for each row execute function audit.qa_fail()",
      );
      try {
        assert.equal((await request("b", `me/sessions/${ctx}`, "DELETE")).status, 409);
        assert.equal(
          (await db.query("select revoked_at from identity.context_sessions where id=$1", [ctx]))
            .rows[0].revoked_at,
          null,
        );
      } finally {
        await db.query("drop trigger qa_fail on audit.security_events");
      }
      assert.equal((await request("b", `me/sessions/${ctx}`, "DELETE")).status, 204);
    },
  );
  await check("SEC-12", "service_role no puede actualizar ni borrar eventos", async () => {
    for (const action of [
      "update audit.security_events set reason=reason",
      "delete from audit.security_events",
    ]) {
      await db.query("begin");
      await db.query("set local role service_role");
      try {
        await assert.rejects(db.query(action), (e) => ["42501", "P0001"].includes(e.code));
      } finally {
        await db.query("rollback");
      }
    }
  });
  await check("TEN-12", "DENY explícito domina ALLOW del propietario", async () => {
    const ctx = await activate("a", "A");
    await db.query(
      "insert into authz.membership_permission_overrides(membership_id,permission_id,effect,reason) select $1,id,'DENY','QA deny override' from authz.permissions where code='identity.membership-manage'",
      [memberships.aA],
    );
    try {
      assert.equal(
        (await request("a", "user-associations", "POST", mutation("A"), ctx)).status,
        403,
      );
    } finally {
      await db.query("delete from authz.membership_permission_overrides where membership_id=$1", [
        memberships.aA,
      ]);
    }
  });
  await check("TEN-14", "Una sola transición gana con misma versión", async () => {
    await db.query(
      "update identity.account_memberships set status='ACTIVE',row_version=10 where id=$1",
      [memberships.multiA],
    );
    const ctx = await activate("a", "A");
    const results = await Promise.all(
      [1, 2].map(() =>
        request(
          "a",
          `user-associations/${memberships.multiA}/suspend`,
          "POST",
          { expectedVersion: 10, reason: "QA concurrent suspension" },
          ctx,
        ),
      ),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    await db.query("update identity.account_memberships set status='ACTIVE' where id=$1", [
      memberships.multiA,
    ]);
  });
  await check("SES-05", "Cerrar A conserva B y permite nueva activación de A", async () => {
    const a = await activate("multi", "A", "client-A");
    const b = await activate("multi", "B", "client-B");
    assert.equal(
      (await request("multi", "session-contexts/current", "DELETE", undefined, a)).status,
      204,
    );
    assert.equal(
      (await request("multi", "session-contexts/current", "GET", undefined, a)).status,
      404,
    );
    assert.equal(
      (await request("multi", "session-contexts/current", "GET", undefined, b)).status,
      200,
    );
    await activate("multi", "A", "client-A");
  });
  await check("SES-06", "Suspender A conserva B en otra sesión", async () => {
    const a = await activate("multi", "A", "client-A");
    const b = await activate("multi", "B", "client-B");
    const version = (
      await db.query("select row_version from identity.account_memberships where id=$1", [
        memberships.multiA,
      ])
    ).rows[0].row_version;
    const owner = await activate("a", "A");
    assert.equal(
      (
        await request(
          "a",
          `user-associations/${memberships.multiA}/suspend`,
          "POST",
          { expectedVersion: Number(version), reason: "QA suspend only account A" },
          owner,
        )
      ).status,
      201,
    );
    assert.equal(
      (await request("multi", "session-contexts/current", "GET", undefined, a)).status,
      404,
    );
    assert.equal(
      (await request("multi", "session-contexts/current", "GET", undefined, b)).status,
      200,
    );
    await db.query("update identity.account_memberships set status='ACTIVE' where id=$1", [
      memberships.multiA,
    ]);
  });
  await check("SES-09", "Límite inactivo SQL (reloj del fixture)", async () => {
    const ctx = await activate("a", "A");
    await db.query(
      "update identity.context_sessions set idle_expires_at=now()-interval '1 second' where id=$1",
      [ctx],
    );
    assert.equal(
      (await request("a", "session-contexts/current", "GET", undefined, ctx)).status,
      404,
    );
  });
  await check("SES-10", "Límite absoluto SQL (reloj del fixture)", async () => {
    const ctx = await activate("a", "A");
    await db.query(
      "update identity.context_sessions set idle_expires_at=now()-interval '1 second',expires_at=now()-interval '1 second' where id=$1",
      [ctx],
    );
    assert.equal(
      (await request("a", "session-contexts/current", "GET", undefined, ctx)).status,
      404,
    );
  });
  await check("REC-13", "MFA insuficiente impide apertura; control válido", async () => {
    const ctx = await activate("op1", "A");
    const body = {
      userId: users.target.id,
      requestedChannel: "SUPPORT_CASE",
      reason: "QA synthetic recovery case",
    };
    assert.equal(
      (
        await request(
          "op1",
          "identity-recovery-cases",
          "POST",
          body,
          ctx,
          token("op1", { aal: "aal1" }),
        )
      ).status,
      403,
    );
    assert.equal((await request("op1", "identity-recovery-cases", "POST", body, ctx)).status, 201);
  });
  for (const [id, operation] of [
    ["REC-08", "self"],
    ["REC-11", "duplicate"],
    ["REC-12", "dual"],
  ])
    await check(id, `Doble control de recuperación ${operation}`, async () => {
      const op1 = await activate("op1", "A");
      const op2 = await activate("op2", "A");
      const target = await activate("target", "A");
      const created = await request(
        "op1",
        "identity-recovery-cases",
        "POST",
        {
          userId: users.target.id,
          requestedChannel: "SUPPORT_CASE",
          reason: "QA synthetic recovery case",
        },
        op1,
      );
      assert.equal(created.status, 201);
      const approve = (u, ctx, v) =>
        request(
          u,
          `identity-recovery-cases/${created.body.id}/approvals`,
          "POST",
          {
            expectedVersion: v,
            verificationMethod: "qa-synthetic",
            evidenceReferences: ["qa:synthetic"],
            reason: "QA independent synthetic check",
          },
          ctx,
        );
      if (operation === "self") {
        assert.equal((await approve("target", target, 1)).status, 403);
        assert.equal(
          (
            await db.query(
              "select count(*) from identity.recovery_approvals where recovery_case_id=$1",
              [created.body.id],
            )
          ).rows[0].count,
          "0",
        );
        return;
      }
      const first = await approve("op1", op1, 1);
      assert.equal(first.status, 201);
      assert.equal(first.body.status, "VERIFYING");
      if (operation === "duplicate") {
        assert.equal((await approve("op1", op1, 2)).status, 409);
        return;
      }
      const second = await approve("op2", op2, 2);
      assert.equal(second.status, 201);
      assert.equal(second.body.status, "APPROVED");
      assert.equal(second.body.approvalCount, 2);
    });
  await check("REC-10", "Una aprobación no permite emitir recuperación", async () => {
    const op1 = await activate("op1", "A");
    const created = await request(
      "op1",
      "identity-recovery-cases",
      "POST",
      {
        userId: users.target.id,
        requestedChannel: "SUPPORT_CASE",
        reason: "QA synthetic recovery case",
      },
      op1,
    );
    const first = await request(
      "op1",
      `identity-recovery-cases/${created.body.id}/approvals`,
      "POST",
      {
        expectedVersion: 1,
        verificationMethod: "qa-synthetic",
        evidenceReferences: ["qa:synthetic"],
        reason: "QA first independent approval",
      },
      op1,
    );
    assert.equal(first.status, 201);
    const issuedBefore = issuedRecoveries.length;
    assert.equal(
      (
        await request(
          "op1",
          `identity-recovery-cases/${created.body.id}/reset`,
          "POST",
          { expectedVersion: 2, reason: "QA attempted recovery before dual approval" },
          op1,
        )
      ).status,
      409,
    );
    assert.equal(issuedRecoveries.length, issuedBefore);
  });
  await check("REC-14", "Reset controlado tras dos aprobaciones", async () => {
    const op1 = await activate("op1", "A");
    const op2 = await activate("op2", "A");
    const targetContext = await activate("target", "A", "target-before-recovery");
    const created = await request(
      "op1",
      "identity-recovery-cases",
      "POST",
      {
        userId: users.target.id,
        requestedChannel: "SUPPORT_CASE",
        reason: "QA controlled reset after dual approval",
      },
      op1,
    );
    const approve = (user, context, expectedVersion) =>
      request(
        user,
        `identity-recovery-cases/${created.body.id}/approvals`,
        "POST",
        {
          expectedVersion,
          verificationMethod: "qa-synthetic",
          evidenceReferences: [`qa:${user}`],
          reason: `QA independent approval by ${user}`,
        },
        context,
      );
    assert.equal((await approve("op1", op1, 1)).status, 201);
    assert.equal((await approve("op2", op2, 2)).status, 201);
    const issuedBefore = issuedRecoveries.length;
    const reset = await request(
      "op2",
      `identity-recovery-cases/${created.body.id}/reset`,
      "POST",
      { expectedVersion: 3, reason: "QA issue controlled recovery after dual approval" },
      op2,
    );
    assert.equal(reset.status, 200, JSON.stringify(reset));
    assert.equal(reset.body.status, "RESET_ISSUED");
    assert.equal(reset.body.approvalCount, 2);
    assert.equal(issuedRecoveries.length, issuedBefore + 1);
    assert.deepEqual(issuedRecoveries.at(-1), {
      identitySubject: users.target.sub,
      email: users.target.email,
    });
    assert.equal(
      (await request("target", "session-contexts/current", "GET", undefined, targetContext)).status,
      404,
    );
    const events = await db.query(
      "select event_type from audit.security_events where metadata->>'caseId'=$1 order by event_type",
      [created.body.id],
    );
    assert.deepEqual(
      events.rows.map((row) => row.event_type),
      [
        "RECOVERY_APPROVED",
        "RECOVERY_APPROVED",
        "RECOVERY_REQUESTED",
        "RECOVERY_RESET_ISSUED",
        "SESSIONS_REVOKED_GLOBAL",
      ],
    );
    assert.equal(
      (
        await request(
          "op2",
          `identity-recovery-cases/${created.body.id}/reset`,
          "POST",
          { expectedVersion: 3, reason: "QA replay of controlled recovery request" },
          op2,
        )
      ).status,
      409,
    );
    assert.equal(issuedRecoveries.length, issuedBefore + 1);
  });
  await check("REC-16", "Entradas inválidas se rechazan con 400 sin crear caso", async () => {
    const ctx = await activate("op1", "A");
    const before = (await db.query("select count(*) from identity.recovery_cases")).rows[0].count;
    assert.equal(
      (await request("op1", "identity-recovery-cases", "POST", { userId: "invalid" }, ctx)).status,
      400,
    );
    assert.equal(
      (await db.query("select count(*) from identity.recovery_cases")).rows[0].count,
      before,
    );
  });
} catch (error) {
  results.push({ id: "SETUP", status: "FALLIDO", error: error.message });
} finally {
  await app?.close();
  await new Promise((resolve) => (issuerServer ? issuerServer.close(resolve) : resolve()));
  await db?.end();
  await admin.end();
  await mkdir("tmp", { recursive: true });
  const report = {
    started,
    finished: new Date().toISOString(),
    database: run,
    scope:
      "HTTP real + PostgreSQL; identidad/JWKS y AAL sintéticos. Sin validación humana ni Supabase Auth real.",
    results,
  };
  await writeFile(output, JSON.stringify(report, null, 2));
  console.info(
    JSON.stringify(
      {
        output,
        passed: results.filter((r) => r.status === "APROBADO").length,
        failed: results.filter((r) => r.status === "FALLIDO"),
      },
      null,
      2,
    ),
  );
  if (results.some((r) => r.status === "FALLIDO")) process.exitCode = 1;
}
