import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

import pg from "pg";

const started = new Date().toISOString();
const results = [];
const check = async (id, name, fn) => {
  try {
    await fn();
    results.push({ id, name, status: "APROBADO" });
  } catch (error) {
    results.push({ id, name, status: "FALLIDO", error: error.message });
  }
};

const statusOutput = execFileSync(
  process.env.ComSpec ?? "cmd.exe",
  ["/d", "/s", "/c", "node_modules\\.bin\\supabase.CMD status -o json"],
  { encoding: "utf8", windowsHide: true },
);
const status = JSON.parse(statusOutput.slice(statusOutput.indexOf("{")));
const baseUrl = status.API_URL;
const anonKey = status.ANON_KEY ?? status.PUBLISHABLE_KEY;
const serviceRoleKey = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
const databaseUrl = status.DB_URL;
assert.equal(typeof baseUrl, "string");
assert.equal(typeof anonKey, "string");
assert.equal(typeof serviceRoleKey, "string");
assert.equal(typeof databaseUrl, "string");

const headers = (key, token = key) => ({
  accept: "application/json",
  apikey: key,
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
});
const jsonRequest = async (path, init = {}, key = anonKey, token = key) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...headers(key, token), ...init.headers },
    signal: AbortSignal.timeout(8_000),
  });
  const text = await response.text();
  let body;
  try {
    body = text.length === 0 ? null : JSON.parse(text);
  } catch {
    body = { unparsed: true };
  }
  return { status: response.status, ok: response.ok, body };
};
const adminRequest = (path, init = {}) =>
  jsonRequest(`/auth/v1${path}`, init, serviceRoleKey, serviceRoleKey);
const passwordLogin = (email, password) =>
  jsonRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
const refresh = (token) =>
  jsonRequest("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: token }),
  });
const strongPassword = () => `Ice24!${randomBytes(15).toString("base64url")}aA1`;

const listUsers = async () => {
  const response = await adminRequest("/admin/users?per_page=1000");
  assert.equal(response.ok, true, `Unable to list local auth users: ${response.status}`);
  return response.body.users;
};
const upsertAuthUser = async (email, password) => {
  const existing = (await listUsers()).find((user) => user.email?.toLowerCase() === email);
  const response = existing
    ? await adminRequest(`/admin/users/${existing.id}`, {
        method: "PUT",
        body: JSON.stringify({ password, email_confirm: true }),
      })
    : await adminRequest("/admin/users", {
        method: "POST",
        body: JSON.stringify({ email, password, email_confirm: true }),
      });
  assert.equal(response.ok, true, `Unable to provision ${email}: ${response.status}`);
  return response.body.id;
};
const clearFactors = async (userId) => {
  const listed = await adminRequest(`/admin/users/${userId}/factors`);
  assert.equal(listed.ok, true, `Unable to list factors: ${listed.status}`);
  for (const factor of listed.body) {
    const deleted = await adminRequest(`/admin/users/${userId}/factors/${factor.id}`, {
      method: "DELETE",
    });
    assert.equal(deleted.ok, true, `Unable to delete factor: ${deleted.status}`);
  }
};
const decodeBase32 = (input) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of input.replace(/=+$/u, "").toUpperCase()) {
    const value = alphabet.indexOf(character);
    assert.ok(value >= 0, "Invalid TOTP secret");
    bits += value.toString(2).padStart(5, "0");
  }
  return Buffer.from(
    Array.from({ length: Math.floor(bits.length / 8) }, (_, index) =>
      Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2),
    ),
  );
};
const totp = (secret, offset = 0) => {
  const counter = Math.floor(Date.now() / 30_000) + offset;
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const position = digest.at(-1) & 0x0f;
  const binary = (digest.readUInt32BE(position) & 0x7fffffff) % 1_000_000;
  return String(binary).padStart(6, "0");
};
const challenge = async (accessToken, factorId) => {
  const response = await jsonRequest(
    `/auth/v1/factors/${factorId}/challenge`,
    { method: "POST", body: "{}" },
    anonKey,
    accessToken,
  );
  assert.equal(response.ok, true, `MFA challenge failed: ${response.status}`);
  return response.body.id;
};
const verifyFactor = (accessToken, factorId, challengeId, code) =>
  jsonRequest(
    `/auth/v1/factors/${factorId}/verify`,
    { method: "POST", body: JSON.stringify({ challenge_id: challengeId, code }) },
    anonKey,
    accessToken,
  );

const credentials = {
  multi: { email: "qa-multi@example.test", password: strongPassword() },
  read: { email: "qa-read@example.test", password: strongPassword() },
  mfa: { email: "qa-mfa-auto@example.test", password: strongPassword() },
  revoke: { email: "qa-revoke-auto@example.test", password: strongPassword() },
  recovery: {
    email: "qa-recovery-auto@example.test",
    password: strongPassword(),
    newPassword: strongPassword(),
  },
  recoveryExpired: {
    email: "qa-recovery-expired-auto@example.test",
    password: strongPassword(),
  },
};
const ids = {};
for (const [name, credential] of Object.entries(credentials)) {
  ids[name] = await upsertAuthUser(credential.email, credential.password);
  await clearFactors(ids[name]);
}

await check("AUTH-06/07", "Login negativo sin enumeración", async () => {
  const known = await passwordLogin(credentials.multi.email, "QA-Wrong-Password-2026!");
  const unknown = await passwordLogin("qa-nonexistent@example.test", "QA-Wrong-Password-2026!");
  assert.equal(known.status, 400);
  assert.equal(unknown.status, 400);
  assert.equal(typeof known.body.access_token, "undefined");
  assert.equal(typeof unknown.body.access_token, "undefined");
  assert.equal(known.body.message, unknown.body.message);
  assert.equal((await passwordLogin(credentials.multi.email, credentials.multi.password)).ok, true);
});

await check("AUTH-11/15", "TOTP correcto, incorrecto, vencido y AAL2", async () => {
  const login = await passwordLogin(credentials.mfa.email, credentials.mfa.password);
  assert.equal(login.ok, true);
  const enrollment = await jsonRequest(
    "/auth/v1/factors",
    {
      method: "POST",
      body: JSON.stringify({ factor_type: "totp", friendly_name: "ICE24 QA automated" }),
    },
    anonKey,
    login.body.access_token,
  );
  assert.equal(enrollment.ok, true, `MFA enrollment failed: ${enrollment.status}`);
  const factorId = enrollment.body.id;
  const secret = enrollment.body.totp.secret;
  const current = totp(secret);
  const wrong = String((Number(current) + 1) % 1_000_000).padStart(6, "0");
  const wrongResult = await verifyFactor(
    login.body.access_token,
    factorId,
    await challenge(login.body.access_token, factorId),
    wrong,
  );
  assert.equal(wrongResult.ok, false);
  const expiredResult = await verifyFactor(
    login.body.access_token,
    factorId,
    await challenge(login.body.access_token, factorId),
    totp(secret, -10),
  );
  assert.equal(expiredResult.ok, false);
  const validResult = await verifyFactor(
    login.body.access_token,
    factorId,
    await challenge(login.body.access_token, factorId),
    totp(secret),
  );
  assert.equal(validResult.ok, true, `MFA verification failed: ${validResult.status}`);
  const claims = JSON.parse(Buffer.from(validResult.body.access_token.split(".")[1], "base64url"));
  assert.equal(claims.aal, "aal2");
});

await check("SES-03/07", "Revocación global invalida refresh de dos clientes", async () => {
  const first = await passwordLogin(credentials.revoke.email, credentials.revoke.password);
  const second = await passwordLogin(credentials.revoke.email, credentials.revoke.password);
  assert.equal(first.ok && second.ok, true);
  const logout = await jsonRequest(
    "/auth/v1/logout?scope=global",
    { method: "POST" },
    anonKey,
    second.body.access_token,
  );
  assert.equal(logout.ok, true, `Global logout failed: ${logout.status}`);
  assert.equal((await refresh(first.body.refresh_token)).ok, false);
  assert.equal((await refresh(second.body.refresh_token)).ok, false);
});

await check("REC-01/06", "Recuperación real, cambio de clave y enlace de un uso", async () => {
  const oldSession = await passwordLogin(credentials.recovery.email, credentials.recovery.password);
  assert.equal(oldSession.ok, true);
  const known = await jsonRequest("/auth/v1/recover", {
    method: "POST",
    body: JSON.stringify({ email: credentials.recovery.email }),
  });
  const unknown = await jsonRequest("/auth/v1/recover", {
    method: "POST",
    body: JSON.stringify({ email: "qa-recovery-unknown@example.test" }),
  });
  assert.equal(known.status, unknown.status);
  const generated = await adminRequest("/admin/generate_link", {
    method: "POST",
    body: JSON.stringify({ type: "recovery", email: credentials.recovery.email }),
  });
  assert.equal(generated.ok, true, `Recovery link generation failed: ${generated.status}`);
  const verified = await jsonRequest("/auth/v1/verify", {
    method: "POST",
    body: JSON.stringify({
      type: "recovery",
      email: credentials.recovery.email,
      token: generated.body.email_otp,
    }),
  });
  assert.equal(verified.ok, true, `Recovery verification failed: ${verified.status}`);
  const changed = await jsonRequest(
    "/auth/v1/user",
    { method: "PUT", body: JSON.stringify({ password: credentials.recovery.newPassword }) },
    anonKey,
    verified.body.access_token,
  );
  assert.equal(changed.ok, true, `Password update failed: ${changed.status}`);
  const logout = await jsonRequest(
    "/auth/v1/logout?scope=global",
    { method: "POST" },
    anonKey,
    verified.body.access_token,
  );
  assert.equal(logout.ok, true);
  assert.equal(
    (await passwordLogin(credentials.recovery.email, credentials.recovery.password)).ok,
    false,
  );
  assert.equal((await refresh(oldSession.body.refresh_token)).ok, false);
  assert.equal(
    (await passwordLogin(credentials.recovery.email, credentials.recovery.newPassword)).ok,
    true,
  );
  const replay = await jsonRequest("/auth/v1/verify", {
    method: "POST",
    body: JSON.stringify({
      type: "recovery",
      email: credentials.recovery.email,
      token: generated.body.email_otp,
    }),
  });
  assert.equal(replay.ok, false);
});

await check("REC-04", "Enlace de recuperación vencido", async () => {
  const generated = await adminRequest("/admin/generate_link", {
    method: "POST",
    body: JSON.stringify({ type: "recovery", email: credentials.recoveryExpired.email }),
  });
  assert.equal(generated.ok, true, `Recovery link generation failed: ${generated.status}`);
  const expiryDatabase = new pg.Client({ connectionString: databaseUrl });
  await expiryDatabase.connect();
  try {
    const oneTimeTokens = await expiryDatabase.query(
      `update auth.one_time_tokens
       set created_at=now()-interval '2 days', updated_at=now()-interval '2 days'
       where user_id=$1`,
      [ids.recoveryExpired],
    );
    const legacyToken = await expiryDatabase.query(
      `update auth.users set recovery_sent_at=now()-interval '2 days' where id=$1`,
      [ids.recoveryExpired],
    );
    assert.ok(
      oneTimeTokens.rowCount > 0 || legacyToken.rowCount > 0,
      "Recovery token was not persisted for expiry test",
    );
  } finally {
    await expiryDatabase.end();
  }
  const verified = await jsonRequest("/auth/v1/verify", {
    method: "POST",
    body: JSON.stringify({
      type: "recovery",
      email: credentials.recoveryExpired.email,
      token: generated.body.email_otp,
    }),
  });
  assert.equal(verified.ok, false);
});

const database = new pg.Client({ connectionString: databaseUrl });
await database.connect();
try {
  await database.query("begin");
  const accountIds = {};
  for (const suffix of ["A", "B"]) {
    const name = `QA Visual Cuenta ${suffix}`;
    const existing = await database.query(
      "select id from identity.accounts where name=$1 and archived_at is null order by created_at limit 1",
      [name],
    );
    accountIds[suffix] = existing.rows[0]?.id ?? randomUUID();
    if (existing.rowCount === 0) {
      await database.query(
        "insert into identity.accounts(id,name,account_type) values($1,$2,'COMPANY')",
        [accountIds[suffix], name],
      );
    }
  }
  const localUserIds = {};
  for (const alias of ["multi", "read"]) {
    const credential = credentials[alias];
    const existing = await database.query(
      "select id from identity.users where lower(email)=lower($1)",
      [credential.email],
    );
    localUserIds[alias] = existing.rows[0]?.id ?? randomUUID();
    if (existing.rowCount === 0) {
      await database.query(
        `insert into identity.users(id,identity_subject,username,email,display_name,status,last_identity_sync_at)
         values($1,$2,$3,$4,$5,'ACTIVE',now())`,
        [localUserIds[alias], ids[alias], `qa-${alias}`, credential.email, `QA ${alias}`],
      );
    } else {
      await database.query(
        `update identity.users set identity_subject=$2,status='ACTIVE',last_identity_sync_at=now(),updated_at=now()
         where id=$1`,
        [localUserIds[alias], ids[alias]],
      );
    }
  }
  for (const [alias, account, role] of [
    ["multi", "A", "TC"],
    ["multi", "B", "AU"],
    ["read", "A", "AU"],
  ]) {
    let membership = await database.query(
      `select id from identity.account_memberships
       where user_id=$1 and account_id=$2 and status in ('PENDING','ACTIVE','SUSPENDED')`,
      [localUserIds[alias], accountIds[account]],
    );
    const membershipId = membership.rows[0]?.id ?? randomUUID();
    if (membership.rowCount === 0) {
      await database.query(
        `insert into identity.account_memberships(id,user_id,account_id,status)
         values($1,$2,$3,'ACTIVE')`,
        [membershipId, localUserIds[alias], accountIds[account]],
      );
    } else {
      await database.query(
        "update identity.account_memberships set status='ACTIVE',valid_to=null,updated_at=now() where id=$1",
        [membershipId],
      );
    }
    await database.query("delete from authz.membership_roles where membership_id=$1", [
      membershipId,
    ]);
    await database.query(
      `insert into authz.membership_roles(membership_id,role_id)
       select $1,id from authz.roles where code=$2 and status='ACTIVE'`,
      [membershipId, role],
    );
    await database.query("delete from authz.user_scopes where membership_id=$1", [membershipId]);
    await database.query(
      "insert into authz.user_scopes(membership_id,scope_type) values($1,'ACCOUNT')",
      [membershipId],
    );
  }
  await database.query("commit");
  const multiSession = await passwordLogin(credentials.multi.email, credentials.multi.password);
  const readSession = await passwordLogin(credentials.read.email, credentials.read.password);
  assert.equal(multiSession.ok && readSession.ok, true);
  await mkdir("tmp", { recursive: true });
  await writeFile(
    "tmp/phase3-block3-private.json",
    JSON.stringify(
      {
        warning: "LOCAL QA ONLY - DO NOT COMMIT OR ATTACH AS EVIDENCE",
        accounts: accountIds,
        credentials: { multi: credentials.multi, read: credentials.read },
        sessions: {
          multi: {
            accessToken: multiSession.body.access_token,
            refreshToken: multiSession.body.refresh_token,
          },
          read: {
            accessToken: readSession.body.access_token,
            refreshToken: readSession.body.refresh_token,
          },
        },
      },
      null,
      2,
    ),
  );
  await writeFile(
    "tmp/phase3-runtime-private.json",
    JSON.stringify(
      {
        SUPABASE_URL: baseUrl,
        SUPABASE_ANON_KEY: anonKey,
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
        DATABASE_URL: databaseUrl,
        OIDC_ISSUER: `${baseUrl}/auth/v1`,
        OIDC_AUDIENCE: "authenticated",
        PRIVATE_API_URL: "http://127.0.0.1:3001/v1",
        PRIVATE_WEB_URL: "http://127.0.0.1:3000",
        BFF_API_SHARED_SECRET: randomBytes(32).toString("base64url"),
        BFF_SESSION_SECRET: randomBytes(32).toString("base64url"),
      },
      null,
      2,
    ),
  );
} catch (error) {
  await database.query("rollback");
  throw error;
} finally {
  await database.end();
}

const report = {
  started,
  finished: new Date().toISOString(),
  scope: "Supabase Auth local real; credenciales, TOTP y tokens excluidos del reporte.",
  results,
  block3: {
    status: "PREPARADO_PARA_VALIDACION_VISUAL",
    accounts: ["QA Visual Cuenta A", "QA Visual Cuenta B"],
    privateMaterial: "tmp/phase3-block3-private.json",
  },
};
await mkdir("tmp", { recursive: true });
await writeFile("tmp/phase3-supabase-auth.json", JSON.stringify(report, null, 2));
console.info(
  JSON.stringify(
    {
      output: "tmp/phase3-supabase-auth.json",
      passed: results.filter((result) => result.status === "APROBADO").length,
      failed: results.filter((result) => result.status === "FALLIDO"),
      block3: report.block3.status,
    },
    null,
    2,
  ),
);
if (results.some((result) => result.status === "FALLIDO")) process.exitCode = 1;
