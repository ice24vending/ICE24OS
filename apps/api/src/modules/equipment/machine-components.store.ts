import {
  addMachineComponentSchema,
  machineComponentTransitionSchema,
  type MachineComponentConfig,
  type MachineComponentOrigin,
  type MachineComponents,
} from "@ice24/contracts";
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from "@nestjs/common";
import type { PoolClient } from "pg";
import type { SecurityRequest } from "../../common/security/security-request.js";
import {
  EquipmentDatabase,
  one,
  versionHeader,
  type Operation,
  type RecordRow,
} from "./equipment.database.js";

interface ConfigRow {
  id: string;
  machine_id: string;
  component_catalog_id: string;
  origin: MachineComponentOrigin;
  status: "active" | "inactive";
  valid_from: Date;
  valid_to: Date | null;
  actor_id: string;
  reason: string;
  row_version: number;
}
interface ListedRow extends ConfigRow {
  code: string;
  data: Record<string, unknown>;
  scope: "OFFICIAL" | "ACCOUNT";
  catalog_status: "active" | "retired";
  catalog_account_id: string | null;
}

const LISTED = `select c.*,e.code,e.data,e.scope,e.status as catalog_status,e.account_id as catalog_account_id
  from equipment.machine_component_configs c join equipment.catalog_entries e on e.id=c.component_catalog_id`;

/**
 * Component details are shown only when the component is official or owned by the active
 * account; actor and reason only for versions recorded while the active account owned the
 * machine. Earlier owners' private data stays in the history without being disclosed.
 */
function toConfig(row: ListedRow, accountId: string, ownedSince: Date): MachineComponentConfig {
  const visible = row.scope === "OFFICIAL" || row.catalog_account_id === accountId;
  const own = new Date(row.valid_from).getTime() >= ownedSince.getTime();
  return {
    id: row.id,
    machineId: row.machine_id,
    componentCatalogId: row.component_catalog_id,
    component: visible
      ? {
          code: row.code,
          name: typeof row.data.name === "string" ? row.data.name : row.code,
          scope: row.scope,
          status: row.catalog_status,
        }
      : null,
    origin: row.origin,
    status: row.status,
    validFrom: new Date(row.valid_from).toISOString(),
    validTo: row.valid_to === null ? null : new Date(row.valid_to).toISOString(),
    actorId: own ? row.actor_id : null,
    reason: own ? row.reason : null,
    version: Number(row.row_version),
  };
}

async function ownedSince(client: PoolClient, machineId: string): Promise<Date> {
  const row = (
    await client.query<{ valid_from: Date }>(
      "select valid_from from equipment.machine_periods where machine_id=$1 and kind='ownership' and valid_to is null",
      [machineId],
    )
  ).rows[0];
  if (!row) throw new NotFoundException("Resource not found");
  return new Date(row.valid_from);
}

async function event(
  client: PoolClient,
  op: Operation,
  accountId: string,
  machineId: string,
  type: string,
  reason: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  // The machine is the audited resource so the change appears in its timeline.
  await client.query(
    `insert into equipment.events(account_id,resource_id,actor_id,context_id,correlation_id,event_type,reason,before_data,after_data)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      accountId,
      machineId,
      op.userId,
      op.contextId,
      op.correlationId,
      type,
      reason,
      JSON.stringify(before),
      JSON.stringify(after),
    ],
  );
}

/** Machine file section: current configuration and full history (F4-19). */
export async function listMachineComponents(
  client: PoolClient,
  op: Operation,
  machineId: string,
): Promise<MachineComponents> {
  const since = await ownedSince(client, machineId);
  const rows = (
    await client.query<ListedRow>(
      `${LISTED} where c.machine_id=$1 order by c.valid_from,c.row_version,c.id limit 1000`,
      [machineId],
    )
  ).rows.map((row) => toConfig(row, op.accountId, since));
  return { machineId, current: rows.filter((row) => row.validTo === null), history: rows };
}

/** Activation (F4-08/F4-10): the template's default components, in the same transaction. */
export async function preloadTemplateComponents(
  client: PoolClient,
  op: Operation,
  machine: RecordRow,
  componentIds: readonly string[],
  reason: string,
): Promise<void> {
  const ids = [...new Set(componentIds)];
  await client.query(
    `insert into equipment.machine_component_configs(machine_id,component_catalog_id,origin,status,valid_from,actor_id,reason)
    select $1,unnest($2::uuid[]),'TEMPLATE_DEFAULT','active',now(),$3,$4`,
    [machine.id, ids, op.userId, reason],
  );
  await event(
    client,
    op,
    machine.account_id,
    machine.id,
    "MACHINE_COMPONENTS_PRELOADED",
    reason,
    null,
    {
      templateId: machine.template_id,
      componentCatalogIds: ids,
    },
  );
}

/**
 * Transfer (F4-12): the configuration travels with the machine. Versions that use components
 * private to the former account are closed at the transfer instant; they stay in the history
 * and the new account sees them without component details.
 */
export async function closeForeignCustomComponents(
  client: PoolClient,
  op: Operation,
  machineId: string,
  fromAccountId: string,
  time: string,
  reason: string,
): Promise<void> {
  const closed = (
    await client.query<ConfigRow>(
      `update equipment.machine_component_configs c set valid_to=$3
      from equipment.catalog_entries e
      where c.machine_id=$1 and c.valid_to is null and e.id=c.component_catalog_id
        and e.scope='ACCOUNT' and e.account_id=$2 returning c.*`,
      [machineId, fromAccountId, time],
    )
  ).rows;
  if (closed.length > 0)
    await event(
      client,
      op,
      fromAccountId,
      machineId,
      "MACHINE_COMPONENTS_TRANSFER_CLOSED",
      reason,
      { componentCatalogIds: closed.map((row) => row.component_catalog_id) },
      null,
    );
}

@Injectable()
export class MachineComponentsStore {
  constructor(@Inject(EquipmentDatabase) private readonly db: EquipmentDatabase) {}

  async add(
    request: SecurityRequest,
    machineId: string,
    body: unknown,
  ): Promise<MachineComponentConfig> {
    const input = addMachineComponentSchema.parse(body);
    return this.db.run(
      request,
      `machine-components:${machineId}:add`,
      input,
      true,
      async (client, op) => {
        const machine = await this.machine(client, machineId);
        const component = await one(
          client,
          `select * from equipment.catalog_entries where id=$1 and kind='component'
          and (scope='OFFICIAL' or account_id=$2) for share`,
          [input.componentCatalogId, machine.account_id],
        );
        if (component.status !== "active")
          throw new ConflictException("Retired components cannot be added");
        const open = await client.query(
          "select id from equipment.machine_component_configs where machine_id=$1 and component_catalog_id=$2 and valid_to is null",
          [machine.id, component.id],
        );
        if (open.rowCount) throw new ConflictException("Component already configured; activate it");
        const template = await one(
          client,
          "select definition from equipment.template_versions where id=$1",
          [machine.template_id],
        );
        const defaults = Array.isArray(template.definition.components)
          ? template.definition.components
          : [];
        const origin: MachineComponentOrigin =
          (component as RecordRow & { scope: string }).scope === "ACCOUNT"
            ? "ACCOUNT_CUSTOM"
            : defaults.includes(component.id)
              ? "TEMPLATE_DEFAULT"
              : "TEMPLATE_OPTIONAL";
        const row = await this.insert(client, op, machine.id, component.id, origin, "active", {
          reason: input.reason,
        });
        await event(
          client,
          op,
          machine.account_id,
          machine.id,
          "MACHINE_COMPONENT_ADDED",
          input.reason,
          null,
          row,
        );
        return this.dto(client, op, row.id);
      },
    );
  }

  async transition(
    request: SecurityRequest,
    machineId: string,
    componentId: string,
    body: unknown,
    action: "activate" | "deactivate",
  ): Promise<MachineComponentConfig> {
    const input = machineComponentTransitionSchema.parse(body);
    return this.db.run(
      request,
      `machine-components:${machineId}:${componentId}:${action}`,
      input,
      true,
      async (client, op) => {
        const machine = await this.machine(client, machineId);
        const before = (
          await client.query<ConfigRow>(
            `select * from equipment.machine_component_configs
            where machine_id=$1 and component_catalog_id=$2 and valid_to is null for update`,
            [machine.id, componentId],
          )
        ).rows[0];
        if (!before) throw new NotFoundException("Resource not found");
        if (Number(before.row_version) !== versionHeader(request))
          throw new PreconditionFailedException("Version conflict; reload the resource");
        const status = action === "activate" ? "active" : "inactive";
        if (before.status === status) throw new ConflictException(`Component is already ${status}`);
        if (action === "activate") {
          const component = await one(
            client,
            "select status from equipment.catalog_entries where id=$1 for share",
            [componentId],
          );
          if (component.status !== "active")
            throw new ConflictException("Retired components cannot be activated");
        }
        const time = (
          await client.query<{ time: string }>("select clock_timestamp()::text as time")
        ).rows[0]!.time;
        await client.query(
          "update equipment.machine_component_configs set valid_to=$2 where id=$1",
          [before.id, time],
        );
        const row = await this.insert(client, op, machine.id, componentId, before.origin, status, {
          reason: input.reason,
          time,
          version: Number(before.row_version) + 1,
        });
        await event(
          client,
          op,
          machine.account_id,
          machine.id,
          action === "activate" ? "MACHINE_COMPONENT_ACTIVATED" : "MACHINE_COMPONENT_DEACTIVATED",
          input.reason,
          before,
          row,
        );
        return this.dto(client, op, row.id);
      },
    );
  }

  /** The machine was locked and authorized by EquipmentDatabase.run. */
  private async machine(client: PoolClient, id: string): Promise<RecordRow> {
    const machine = await one(client, "select * from equipment.machines where id=$1", [id]);
    if (machine.operational_status === "retired")
      throw new ConflictException("Retired machines cannot be changed");
    return machine;
  }

  private async insert(
    client: PoolClient,
    op: Operation,
    machineId: string,
    componentId: string,
    origin: MachineComponentOrigin,
    status: "active" | "inactive",
    options: { reason: string; time?: string; version?: number },
  ): Promise<ConfigRow> {
    const result = await client.query<ConfigRow>(
      `insert into equipment.machine_component_configs
        (machine_id,component_catalog_id,origin,status,valid_from,actor_id,reason,row_version)
      values($1,$2,$3,$4,coalesce($5::timestamptz,clock_timestamp()),$6,$7,
        coalesce($8,(select coalesce(max(row_version),0)+1 from equipment.machine_component_configs
          where machine_id=$1 and component_catalog_id=$2)))
      returning *`,
      [
        machineId,
        componentId,
        origin,
        status,
        options.time ?? null,
        op.userId,
        options.reason,
        options.version ?? null,
      ],
    );
    return result.rows[0]!;
  }

  private async dto(
    client: PoolClient,
    op: Operation,
    id: string,
  ): Promise<MachineComponentConfig> {
    const row = (await client.query<ListedRow>(`${LISTED} where c.id=$1`, [id])).rows[0]!;
    return toConfig(row, op.accountId, new Date(0));
  }
}
