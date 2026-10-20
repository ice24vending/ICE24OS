import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PERMISSION_CLASSIFICATION, ROLE_PERMISSIONS, type DemoRoleCode } from "./personas";

const migrationsDir = join(import.meta.dirname, "../../../../../supabase/migrations");
const sql = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(join(migrationsDir, name), "utf8"))
  .join("\n")
  // Rollback notes are comments, not grants.
  .replace(/--[^\n]*/g, "");

const quoted = (text: string) => [...text.matchAll(/'([^']+)'/g)].map((match) => match[1]!);
const codesAfter = (text: string, alias: "p|permission" | "r|role") =>
  [
    ...text.matchAll(
      new RegExp(`\\b(?:${alias})\\.code\\s*(?:=\\s*'[^']+'|in\\s*\\([^)]*\\))`, "g"),
    ),
  ].flatMap((match) => quoted(match[0]));

/**
 * Grants seeded by the migrations, read in order from every `insert into authz.role_permissions`
 * statement: each `or` branch pairs its permission codes with its role codes, falling back to
 * the statement-level ones (`... on p.code in (...) where r.code in (...)`). IA's `cross join`
 * grants every permission defined up to that statement.
 */
function migrationGrants(): Map<string, Set<string>> {
  const grants = new Map<string, Set<string>>();
  const defined: string[] = [];
  for (const [statement] of sql.matchAll(
    /insert into authz\.(?:permissions|role_permissions)\b[\s\S]*?;/g,
  )) {
    if (statement.startsWith("insert into authz.permissions")) {
      defined.push(...[...statement.matchAll(/\(\s*'([a-z][\w-]*\.[\w-]+)'/g)].map((m) => m[1]!));
      continue;
    }
    if (/cross join authz\.permissions \w+\s+where (?:role|r)\.code\s*=\s*'IA'/.test(statement)) {
      grants.set("IA", new Set([...(grants.get("IA") ?? []), ...defined]));
      continue;
    }
    const statementPermissions = codesAfter(statement, "p|permission");
    const statementRoles = codesAfter(statement, "r|role");
    for (const clause of statement.split(/\bor\b/)) {
      const clausePermissions = codesAfter(clause, "p|permission");
      const clauseRoles = codesAfter(clause, "r|role");
      const permissions = clausePermissions.length ? clausePermissions : statementPermissions;
      const roles = clauseRoles.length ? clauseRoles : statementRoles;
      if (!clausePermissions.length && !clauseRoles.length) continue;
      for (const role of roles)
        for (const permission of permissions) {
          const set = grants.get(role) ?? new Set<string>();
          set.add(permission);
          grants.set(role, set);
        }
    }
  }
  return grants;
}

describe("demo personas mirror the seeded role permissions", () => {
  it("only uses permission codes that exist in the migrations", () => {
    for (const code of Object.keys(PERMISSION_CLASSIFICATION))
      expect(sql, `permission ${code}`).toMatch(new RegExp(`\\('${code.replace(".", "\\.")}',`));
  });

  it("keeps each permission's data classification", () => {
    for (const [code, classification] of Object.entries(PERMISSION_CLASSIFICATION))
      expect(sql).toMatch(
        new RegExp(`'${code.replace(".", "\\.")}',\\s*'[^']+',\\s*'[^']+',\\s*'${classification}'`),
      );
  });

  it.each(Object.keys(ROLE_PERMISSIONS) as DemoRoleCode[])(
    "grants role %s exactly what the migrations grant",
    (role) => {
      const seeded = [...(migrationGrants().get(role) ?? [])].sort();
      expect([...ROLE_PERMISSIONS[role]].sort()).toEqual(seeded);
    },
  );
});
