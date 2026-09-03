import { readFile } from "node:fs/promises";
import { join } from "node:path";

const workspace = process.cwd();
const failures = [];

const load = async (...segments) =>
  readFile(join(workspace, ...segments), "utf8").catch((error) => {
    failures.push(`Missing ${segments.join("/")}: ${error.code ?? "read_error"}`);
    return "";
  });

const migration = await load("supabase", "migrations", "20260829000100_phase3_identity.sql");
for (const contract of [
  "create schema if not exists identity",
  "create schema if not exists authz",
  "create table identity.context_sessions",
  "create table identity.recovery_approvals",
  "create table audit.security_events",
  "audit.prevent_event_mutation",
  "identity.activate_context",
  "identity.approve_recovery_case",
  "enable row level security",
  "revoke all on schema identity, authz, audit from public, anon, authenticated",
]) {
  if (!migration.toLowerCase().includes(contract.toLowerCase())) {
    failures.push(`Phase 3 migration is missing ${contract}`);
  }
}

const databaseTest = await load("supabase", "tests", "database", "phase3_identity_test.sql");
for (const assertion of [
  "cross-account context activation is rejected",
  "two distinct approvals are required",
  "RLS is enabled on every Phase 3 table",
]) {
  if (!databaseTest.includes(assertion))
    failures.push(`Database isolation suite is missing ${assertion}`);
}

const authorization = await load("packages", "authorization", "src", "index.ts");
for (const rule of [
  "membership_inactive",
  "resource_account_mismatch",
  "account_read_only",
  "explicit_deny",
  "classification_not_granted",
  "scope_not_granted",
  "mfa_required",
]) {
  if (!authorization.includes(rule)) failures.push(`Authorization is missing ${rule}`);
}

const session = await load("apps", "private-web", "src", "server", "session", "session.ts");
for (const control of ["aes-256-gcm", "httpOnly: true", 'sameSite: "lax"', "requireValidCsrf"]) {
  if (!session.includes(control)) failures.push(`BFF session is missing ${control}`);
}

const oidcFlow = await load("apps", "private-web", "src", "server", "session", "oidc-flow.ts");
for (const control of ["code_challenge", "S256", "timingSafeEqual"]) {
  const sources = `${oidcFlow}\n${await load("apps", "private-web", "src", "app", "api", "auth", "authorize", "route.ts")}`;
  if (!sources.includes(control)) failures.push(`OIDC PKCE flow is missing ${control}`);
}

const browserSecuritySources = [
  session,
  await load("apps", "private-web", "src", "server", "session", "supabase-auth.ts"),
  await load("apps", "private-web", "src", "app", "api", "auth", "login", "route.ts"),
].join("\n");
if (/localStorage|sessionStorage/.test(browserSecuritySources)) {
  failures.push("BFF identity code must not persist tokens in browser storage");
}
if (/NEXT_PUBLIC_.*(?:SECRET|SERVICE_ROLE|TOKEN)/.test(browserSecuritySources)) {
  failures.push("A server identity secret is exposed as NEXT_PUBLIC");
}

const supabaseConfig = await load("supabase", "config.toml");
for (const control of [
  "enable_signup = false",
  "jwt_expiry = 300",
  "password_min_length = 12",
  "[auth.mfa.totp]",
  "enroll_enabled = true",
  "verify_enabled = true",
]) {
  if (!supabaseConfig.includes(control))
    failures.push(`Supabase Auth config is missing ${control}`);
}

for (let task = 1; task <= 14; task += 1) {
  await load("docs", "tasks", `task-f3-${String(task).padStart(2, "0")}.md`);
}
await load("docs", "modules", "identity.md");
await load("docs", "runbooks", "identity-access.md");
await load("docs", "backlog", "phase-3-status.md");

if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.info(
    "Validated Phase 3 identity, session, authorization, isolation, audit, UI, and documentation contracts.",
  );
}
