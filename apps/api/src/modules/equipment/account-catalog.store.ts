import {
  ACCOUNT_CATALOG_DATA_VERSION,
  accountCatalogQuerySchema,
  accountMaintenanceActivitySchema,
  createAccountCatalogEntrySchema,
  retireAccountCatalogEntrySchema,
  updateAccountCatalogEntrySchema,
  type AccountCatalogEntry,
  type AccountCatalogPage,
  type UpdateAccountCatalogEntry,
} from "@ice24/contracts";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  PreconditionFailedException,
} from "@nestjs/common";
import type { PoolClient } from "pg";
import type { SecurityRequest } from "../../common/security/security-request.js";
import {
  EquipmentDatabase,
  audit,
  one,
  versionHeader,
  type Operation,
  type RecordRow,
} from "./equipment.database.js";

interface CatalogRow extends RecordRow {
  scope: "OFFICIAL" | "ACCOUNT";
  kind: "component" | "characteristic";
  code: string;
  created_at: Date;
  updated_at: Date;
}

function toEntry(row: CatalogRow): AccountCatalogEntry {
  const data = row.data;
  const text = (key: string) => (typeof data[key] === "string" ? data[key] : null);
  const activity = accountMaintenanceActivitySchema.safeParse(data.maintenanceActivity);
  return {
    id: row.id,
    scope: "ACCOUNT",
    kind: row.kind,
    code: row.code,
    name: text("name") ?? row.code,
    description: text("description"),
    unit: text("unit"),
    maintenanceActivity: activity.success ? activity.data : null,
    status: row.status === "retired" ? "retired" : "active",
    version: Number(row.row_version),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function definition(
  input: UpdateAccountCatalogEntry & { code: string; kind: string },
): Record<string, unknown> {
  return { schemaVersion: ACCOUNT_CATALOG_DATA_VERSION, ...input };
}

const encodeCursor = (code: string) => Buffer.from(code, "utf8").toString("base64url");
function decodeCursor(cursor: string): string {
  const code = Buffer.from(cursor, "base64url").toString("utf8");
  if (!/^[A-Z0-9_-]{2,40}$/.test(code)) throw new BadRequestException("Invalid cursor");
  return code;
}

/** Locks an entry the active account may manage. Official entries stay ICE24-only (403);
 * entries of another account are indistinguishable from missing ones (404). */
async function managed(
  client: PoolClient,
  op: Operation,
  id: string,
  version: number,
): Promise<CatalogRow> {
  const row = (await one(
    client,
    "select * from equipment.catalog_entries where id=$1 and (scope='OFFICIAL' or account_id=$2) for update",
    [id, op.accountId],
  )) as CatalogRow;
  if (row.scope === "OFFICIAL")
    throw new ForbiddenException("Official catalog entries are managed by ICE24");
  if (Number(row.row_version) !== version)
    throw new PreconditionFailedException("Version conflict; reload the resource");
  return row;
}

@Injectable()
export class AccountCatalogStore {
  constructor(@Inject(EquipmentDatabase) private readonly db: EquipmentDatabase) {}

  async list(request: SecurityRequest, query: unknown): Promise<AccountCatalogPage> {
    const input = accountCatalogQuerySchema.parse(query ?? {});
    const after = input.cursor === undefined ? null : decodeCursor(input.cursor);
    return this.db.run(request, "account-catalog-list", null, false, async (client, op) => {
      const rows = (
        await client.query<CatalogRow>(
          `select * from equipment.catalog_entries
          where scope='ACCOUNT' and account_id=$1 and ($2::text is null or status=$2)
            and ($3::text is null or code>$3)
          order by code limit $4`,
          [op.accountId, input.status ?? null, after, input.limit + 1],
        )
      ).rows;
      const items = rows.slice(0, input.limit).map(toEntry);
      const hasMore = rows.length > input.limit;
      const last = items.at(-1);
      return {
        items,
        page: { nextCursor: hasMore && last ? encodeCursor(last.code) : null, hasMore },
      };
    });
  }

  async detail(request: SecurityRequest, id: string): Promise<AccountCatalogEntry> {
    return this.db.run(request, "account-catalog-detail", null, false, async (client, op) =>
      toEntry(
        (await one(
          client,
          "select * from equipment.catalog_entries where id=$1 and scope='ACCOUNT' and account_id=$2",
          [id, op.accountId],
        )) as CatalogRow,
      ),
    );
  }

  async create(request: SecurityRequest, body: unknown): Promise<AccountCatalogEntry> {
    const input = createAccountCatalogEntrySchema.parse(body);
    return this.db.run(request, "account-catalog:create", input, true, async (client, op) => {
      const row = (await one(
        client,
        `insert into equipment.catalog_entries(scope,account_id,kind,code,data)
        values('ACCOUNT',$1,$2,$3,$4) returning *`,
        [op.accountId, input.kind, input.code, JSON.stringify(definition(input))],
      )) as CatalogRow;
      await audit(client, op, row, "ACCOUNT_CATALOG_CREATED", "Account catalog entry created");
      return toEntry(row);
    });
  }

  async update(request: SecurityRequest, id: string, body: unknown): Promise<AccountCatalogEntry> {
    const input = updateAccountCatalogEntrySchema.parse(body);
    return this.db.run(request, `account-catalog:${id}:update`, input, true, async (client, op) => {
      const before = await managed(client, op, id, versionHeader(request));
      if (before.status !== "active")
        throw new ConflictException("Retired catalog entries cannot be edited");
      if (before.kind !== "component" && input.maintenanceActivity !== undefined)
        throw new BadRequestException("Only components define a maintenance activity");
      const row = (await one(
        client,
        `update equipment.catalog_entries set data=$2,row_version=row_version+1,updated_at=now()
          where id=$1 returning *`,
        [id, JSON.stringify(definition({ ...input, code: before.code, kind: before.kind }))],
      )) as CatalogRow;
      await audit(
        client,
        op,
        row,
        "ACCOUNT_CATALOG_UPDATED",
        "Account catalog entry updated",
        before,
      );
      return toEntry(row);
    });
  }

  async retire(request: SecurityRequest, id: string, body: unknown): Promise<AccountCatalogEntry> {
    const input = retireAccountCatalogEntrySchema.parse(body);
    return this.db.run(request, `account-catalog:${id}:retire`, input, true, async (client, op) => {
      const before = await managed(client, op, id, versionHeader(request));
      if (before.status !== "active")
        throw new ConflictException("Catalog entry is already retired");
      const row = (await one(
        client,
        `update equipment.catalog_entries set status='retired',row_version=row_version+1,updated_at=now()
          where id=$1 returning *`,
        [id],
      )) as CatalogRow;
      await audit(client, op, row, "ACCOUNT_CATALOG_RETIRED", input.reason, before);
      return toEntry(row);
    });
  }
}
