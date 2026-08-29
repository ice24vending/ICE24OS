import { readFile } from "node:fs/promises";
import { join } from "node:path";

const workspace = process.cwd();
const environments = ["development", "test", "staging", "production"];
const requiredModules = [
  "backup",
  "database",
  "edge",
  "identity",
  "messaging",
  "object-storage",
  "observability",
  "platform",
  "secrets",
];

const failures = [];

const load = async (...segments) =>
  readFile(join(workspace, ...segments), "utf8").catch((error) => {
    failures.push(`Missing ${segments.join("/")}: ${error.code ?? "read_error"}`);
    return "";
  });

for (const environment of environments) {
  const root = await load("infra", "terraform", "environments", environment, "main.tf");
  const example = await load(
    "infra",
    "terraform",
    "environments",
    environment,
    "terraform.tfvars.example",
  );
  const lock = await load("infra", "terraform", "environments", environment, ".terraform.lock.hcl");
  if (!root.includes(`environment                = "${environment}"`)) {
    failures.push(`${environment} does not bind its own immutable environment name`);
  }
  if (!root.includes('backend "http" {}')) {
    failures.push(`${environment} does not use the isolated remote HTTP state contract`);
  }
  if (!example.includes("provision_cloud             = false")) {
    failures.push(`${environment} example must keep cloud provisioning disabled`);
  }
  if (!lock.includes('version     = "1.10.1"') || !lock.includes('version     = "5.11.0"')) {
    failures.push(`${environment} must lock the reviewed Supabase and Vercel providers`);
  }
}

for (const moduleName of requiredModules) {
  await load("infra", "terraform", "modules", moduleName, "main.tf");
}

const migration = await load("supabase", "migrations", "20260825000100_phase2_platform.sql");
const databaseTest = await load("supabase", "tests", "database", "phase2_platform_test.sql");
for (const contract of [
  "create extension if not exists pgmq",
  "create extension if not exists pg_cron",
  "general_jobs_dlq",
  "pdf_jobs_dlq",
  "infra.enqueue_job",
  "infra.fail_job",
  "insert into storage.buckets",
  "enable row level security",
]) {
  if (!migration.toLowerCase().includes(contract.toLowerCase())) {
    failures.push(`Platform migration is missing ${contract}`);
  }
}

for (const assertion of [
  "infra.enqueue_job",
  "infra.fail_job",
  "pgmq.metrics('general_jobs_dlq')",
  "not public",
  "relation.relrowsecurity",
]) {
  if (!databaseTest.includes(assertion)) {
    failures.push(`Platform database tests are missing ${assertion}`);
  }
}

for (const jsonPath of [
  ["infra", "observability", "dashboard.json"],
  ["apps", "api", "vercel.json"],
]) {
  const content = await load(...jsonPath);
  try {
    JSON.parse(content);
  } catch {
    failures.push(`${jsonPath.join("/")} is not valid JSON`);
  }
}

const deployWorkflow = await load(".github", "workflows", "deploy.yml");
for (const gate of [
  "workflow_dispatch",
  "production_approved",
  "terraform plan",
  "terraform apply",
]) {
  if (!deployWorkflow.includes(gate)) failures.push(`Deployment workflow is missing ${gate}`);
}

const infrastructureWorkflow = await load(".github", "workflows", "infrastructure.yml");
for (const gate of ["terraform validate", "supabase db lint", "supabase test db"]) {
  if (!infrastructureWorkflow.includes(gate)) {
    failures.push(`Infrastructure workflow is missing ${gate}`);
  }
}

const sensitiveFiles = [
  await load("infra", "terraform", "modules", "platform", "main.tf"),
  await load(".github", "workflows", "deploy.yml"),
].join("\n");
for (const secretSignature of [
  /sbp_[a-z0-9]{20,}/i,
  /vercel_[a-z0-9]{20,}/i,
  /eyJ[a-z0-9_-]{20,}\./i,
]) {
  if (secretSignature.test(sensitiveFiles))
    failures.push("A value resembling a real secret is present");
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.info(
    "Validated Phase 2 environment, migration, observability, and deployment contracts.",
  );
}
