import { randomUUID } from "node:crypto";
import {
  resetFrequencyOverridesSchema,
  setFrequencyOverrideSchema,
  type ApiError,
  type EffectiveFrequency,
  type FrequencyActivityType,
  type FrequencyOverride,
  type FrequencyOverrides,
  type FrequencyScope,
  type MachineFrequencies,
  type ResetFrequencyOverridesResult,
  type SetFrequencyOverride,
} from "@ice24/contracts";
import {
  resolveEffectiveFrequency,
  sameFrequency,
  type FrequencyDuration,
  type FrequencyOverride as DomainOverride,
} from "@ice24/domain";
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
  UnprocessableEntityException,
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

interface OverrideRow {
  id: string;
  account_id: string;
  scope: FrequencyScope;
  machine_id: string | null;
  component_catalog_id: string | null;
  activity_code: string;
  activity_type: FrequencyActivityType;
  frequency_value: number;
  frequency_unit: FrequencyDuration["unit"];
  alert_lead_value: number | null;
  alert_lead_unit: FrequencyDuration["unit"] | null;
  factory_frequencies: FrequencyDuration[];
  warranty_warning_acknowledged_at: Date | null;
  valid_from: Date;
  valid_to: Date | null;
  actor_id: string;
  reason: string;
  row_version: number;
}

/** An activity whose frequency the client may change, with its factory value(s). */
interface Target {
  activityCode: string;
  componentCatalogId: string | null;
  activityName: string;
  activityType: FrequencyActivityType;
  /** One value per template in use; account component activities have exactly one. */
  factory: FrequencyDuration[];
  /** RA-01-D1 applies to ICE24 factory values only, not to the client's own components. */
  warrantyApplies: boolean;
}

interface TemplateActivity {
  code: string;
  name: string;
  category: string;
  triggerType: string;
  frequencyDays: number | null;
}
interface ComponentActivity {
  code: string;
  name: string;
  category: string;
  defaultFrequency: FrequencyDuration;
}

/** RA-01-D1: the client may choose the value; leaving the factory value needs explicit consent. */
export class WarrantyWarningRequiredException extends UnprocessableEntityException {
  constructor(correlationId: string | undefined, factory: FrequencyDuration[]) {
    const body: ApiError = {
      error: {
        code: "WARRANTY_WARNING_CONFIRMATION_REQUIRED",
        message:
          "La frecuencia es distinta del valor de fábrica de ICE24 y puede afectar la garantía. Confirma la advertencia para guardarla.",
        details: { factoryFrequencies: factory },
        correlationId: correlationId ?? randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
    super(body);
  }
}

const activityType = (category: string): FrequencyActivityType =>
  category === "sanitation" ? "SANITATION" : "MAINTENANCE";
type TargetKey = Pick<Target, "activityCode" | "componentCatalogId">;
const sameKey = (left: TargetKey, right: TargetKey) =>
  left.activityCode === right.activityCode && left.componentCatalogId === right.componentCatalogId;
const sameTarget = (row: OverrideRow, target: TargetKey) =>
  sameKey(
    { activityCode: row.activity_code, componentCatalogId: row.component_catalog_id },
    target,
  );
const alertOf = (row: OverrideRow): FrequencyDuration | null =>
  row.alert_lead_value === null || row.alert_lead_unit === null
    ? null
    : { value: Number(row.alert_lead_value), unit: row.alert_lead_unit };

function toOverride(row: OverrideRow): FrequencyOverride {
  return {
    id: row.id,
    scope: row.scope,
    machineId: row.machine_id,
    componentCatalogId: row.component_catalog_id,
    activityCode: row.activity_code,
    activityType: row.activity_type,
    frequency: { value: Number(row.frequency_value), unit: row.frequency_unit },
    alertLead: alertOf(row),
    factoryFrequencies: row.factory_frequencies,
    warrantyWarningAcknowledgedAt:
      row.warranty_warning_acknowledged_at === null
        ? null
        : new Date(row.warranty_warning_acknowledged_at).toISOString(),
    validFrom: new Date(row.valid_from).toISOString(),
    validTo: row.valid_to === null ? null : new Date(row.valid_to).toISOString(),
    actorId: row.actor_id,
    reason: row.reason,
    version: Number(row.row_version),
  };
}
const toDomain = (row: OverrideRow): DomainOverride => ({
  frequency: { value: Number(row.frequency_value), unit: row.frequency_unit },
  alertLead: alertOf(row),
  validFrom: new Date(row.valid_from),
  validTo: row.valid_to === null ? null : new Date(row.valid_to),
});

function templateTargets(definition: Record<string, unknown>): Target[] {
  const activities = Array.isArray(definition.activities)
    ? (definition.activities as TemplateActivity[])
    : [];
  // Only time-based activities have a frequency; usage, condition and event triggers do not.
  return activities
    .filter((a) => a.triggerType === "time" && typeof a.frequencyDays === "number")
    .map((a) => ({
      activityCode: a.code,
      componentCatalogId: null,
      activityName: a.name,
      activityType: activityType(a.category),
      factory: [{ value: a.frequencyDays!, unit: "days" }],
      warrantyApplies: true,
    }));
}
function componentTarget(id: string, data: Record<string, unknown>): Target | null {
  const activity = data.maintenanceActivity as ComponentActivity | undefined;
  if (!activity) return null;
  return {
    activityCode: activity.code,
    componentCatalogId: id,
    activityName: activity.name,
    activityType: activityType(activity.category),
    factory: [activity.defaultFrequency],
    warrantyApplies: false,
  };
}

/** Template activities plus the activities of the account's own components active on it. */
async function machineTargets(client: PoolClient, machine: RecordRow): Promise<Target[]> {
  const template = await one(
    client,
    "select definition from equipment.template_versions where id=$1",
    [machine.template_id],
  );
  const components = (
    await client.query<{ id: string; data: Record<string, unknown> }>(
      `select e.id,e.data from equipment.machine_component_configs c
      join equipment.catalog_entries e on e.id=c.component_catalog_id
      where c.machine_id=$1 and c.valid_to is null and c.status='active'
        and e.scope='ACCOUNT' and e.account_id=$2 order by e.code`,
      [machine.id, machine.account_id],
    )
  ).rows;
  return [
    ...templateTargets(template.definition),
    ...components.flatMap((c) => componentTarget(c.id, c.data) ?? []),
  ];
}

/**
 * Account overrides apply to every machine of the account. A template activity may have a
 * different factory value in each template in use; all of them are kept for warranty review.
 */
async function accountTarget(
  client: PoolClient,
  accountId: string,
  input: Pick<SetFrequencyOverride, "activityCode" | "componentCatalogId">,
): Promise<Target> {
  if (input.componentCatalogId !== null) {
    const entry = await one(
      client,
      `select id,data from equipment.catalog_entries
      where id=$1 and kind='component' and scope='ACCOUNT' and account_id=$2 and status='active'`,
      [input.componentCatalogId, accountId],
    );
    const target = componentTarget(entry.id, entry.data);
    if (!target || target.activityCode !== input.activityCode)
      throw new NotFoundException("Resource not found");
    return target;
  }
  const definitions = (
    await client.query<{ definition: Record<string, unknown> }>(
      `select t.definition from equipment.template_versions t where t.id in (
        select m.template_id from equipment.machines m
        where m.account_id=$1 and m.operational_status<>'retired') order by t.id`,
      [accountId],
    )
  ).rows;
  const matches = definitions.flatMap((d) =>
    templateTargets(d.definition).filter((t) => t.activityCode === input.activityCode),
  );
  if (!matches[0]) throw new NotFoundException("Resource not found");
  const factory: FrequencyDuration[] = [];
  for (const value of matches.flatMap((m) => m.factory))
    if (!factory.some((known) => sameFrequency(known, value))) factory.push(value);
  return { ...matches[0], factory };
}

async function openOverrides(
  client: PoolClient,
  accountId: string,
  scope: FrequencyScope,
  machineId: string | null,
  lock = false,
): Promise<OverrideRow[]> {
  return (
    await client.query<OverrideRow>(
      `select * from equipment.maintenance_frequency_overrides
      where account_id=$1 and scope=$2 and machine_id is not distinct from $3 and valid_to is null
      order by activity_code,component_catalog_id nulls first ${lock ? "for update" : ""}`,
      [accountId, scope, machineId],
    )
  ).rows;
}

async function accountMachineIds(client: PoolClient, accountId: string): Promise<string[]> {
  return (
    await client.query<{ id: string }>(
      "select id from equipment.machines where account_id=$1 and operational_status<>'retired' order by id",
      [accountId],
    )
  ).rows.map((row) => row.id);
}

/**
 * Audit and domain event in one row: equipment.events feeds the central audit and the Phase 5
 * outbox (MachineFrequenciesChanged / AccountFrequenciesChanged) in the same transaction.
 * `operation` and `machineIds` are in the outbox allow-list so F4-21 can recalculate calendars.
 */
async function frequenciesChanged(
  client: PoolClient,
  op: Operation,
  scope: FrequencyScope,
  accountId: string,
  resourceId: string,
  machineIds: string[],
  operation: "CREATE" | "UPDATE" | "RESET" | "TRANSFER_CLOSED",
  reason: string,
  before: OverrideRow[],
  after: OverrideRow[],
): Promise<void> {
  await client.query(
    `insert into equipment.events(account_id,resource_id,actor_id,context_id,correlation_id,event_type,reason,before_data,after_data)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      accountId,
      resourceId,
      op.userId,
      op.contextId,
      op.correlationId,
      scope === "MACHINE" ? "MACHINE_FREQUENCIES_CHANGED" : "ACCOUNT_FREQUENCIES_CHANGED",
      reason,
      JSON.stringify(before.length ? { overrides: before } : null),
      JSON.stringify({ operation, scope, machineIds, overrides: after }),
    ],
  );
}

/** Machine file section: effective frequencies with their factory value and source (F4-20). */
export async function listMachineFrequencies(
  client: PoolClient,
  machine: RecordRow,
): Promise<MachineFrequencies> {
  const targets = await machineTargets(client, machine);
  const account = await openOverrides(client, machine.account_id, "ACCOUNT", null);
  const own = await openOverrides(client, machine.account_id, "MACHINE", machine.id);
  const items = targets.map((target): EffectiveFrequency => {
    const accountRow = account.find((row) => sameTarget(row, target)) ?? null;
    const machineRow = own.find((row) => sameTarget(row, target)) ?? null;
    const factory = target.factory[0]!;
    const effective = resolveEffectiveFrequency(
      { frequency: factory, alertLead: null },
      accountRow ? [toDomain(accountRow)] : [],
      machineRow ? [toDomain(machineRow)] : [],
    );
    return {
      activityCode: target.activityCode,
      componentCatalogId: target.componentCatalogId,
      activityName: target.activityName,
      activityType: target.activityType,
      frequency: { value: effective.value, unit: effective.unit },
      alertLead: effective.alertLead,
      source: effective.source,
      alertSource: effective.alertSource,
      factory: { frequency: effective.factoryValue, alertLead: effective.factoryAlertLead },
      differsFromFactory: !sameFrequency(effective, effective.factoryValue),
      warrantyApplies: target.warrantyApplies,
      accountOverride: accountRow ? toOverride(accountRow) : null,
      machineOverride: machineRow ? toOverride(machineRow) : null,
    };
  });
  return { machineId: machine.id, items };
}

/**
 * Transfer (F4-12): machine frequencies belong to the account that defined them. They are closed
 * at the transfer instant and stay as history; the new owner starts from the factory values.
 */
export async function closeMachineFrequencyOverrides(
  client: PoolClient,
  op: Operation,
  machineId: string,
  fromAccountId: string,
  time: string,
  reason: string,
): Promise<void> {
  const closed = (
    await client.query<OverrideRow>(
      `update equipment.maintenance_frequency_overrides set valid_to=$3
      where machine_id=$1 and account_id=$2 and valid_to is null returning *`,
      [machineId, fromAccountId, time],
    )
  ).rows;
  if (closed.length > 0)
    await frequenciesChanged(
      client,
      op,
      "MACHINE",
      fromAccountId,
      machineId,
      [machineId],
      "TRANSFER_CLOSED",
      reason,
      closed,
      [],
    );
}

@Injectable()
export class FrequencyOverridesStore {
  constructor(@Inject(EquipmentDatabase) private readonly db: EquipmentDatabase) {}

  /** Current account-level overrides, so the owner can edit them with If-Match. */
  async listAccount(request: SecurityRequest): Promise<FrequencyOverrides> {
    return this.db.run(request, "account-frequencies", null, false, async (client, op) => ({
      current: (await openOverrides(client, op.accountId, "ACCOUNT", null)).map(toOverride),
    }));
  }

  async set(
    request: SecurityRequest,
    scope: FrequencyScope,
    machineId: string | null,
    body: unknown,
    action: "create" | "update",
  ): Promise<FrequencyOverride> {
    const input = setFrequencyOverrideSchema.parse(body);
    return this.db.run(
      request,
      this.operation(scope, machineId, action),
      input,
      true,
      async (client, op) => {
        const machine = machineId ? await this.machine(client, machineId) : null;
        const accountId = machine?.account_id ?? op.accountId;
        await this.serialize(client, scope, accountId);
        const target = machine
          ? (await machineTargets(client, machine)).find((t) => sameKey(input, t))
          : await accountTarget(client, accountId, input);
        if (!target) throw new NotFoundException("Resource not found");
        const differs = target.factory.some((f) => !sameFrequency(input.frequency, f));
        const warningRequired = target.warrantyApplies && differs;
        if (warningRequired && input.warrantyWarningAcknowledged !== true)
          throw new WarrantyWarningRequiredException(request.correlationId, target.factory);
        const before = (await openOverrides(client, accountId, scope, machineId, true)).find(
          (row) => sameTarget(row, target),
        );
        if (action === "create" && before)
          throw new ConflictException("Frequency already defined; edit it");
        if (action === "update") {
          if (!before) throw new NotFoundException("Resource not found");
          if (Number(before.row_version) !== versionHeader(request))
            throw new PreconditionFailedException("Version conflict; reload the resource");
        }
        const time = (
          await client.query<{ time: string }>("select clock_timestamp()::text as time")
        ).rows[0]!.time;
        if (before)
          await client.query(
            "update equipment.maintenance_frequency_overrides set valid_to=$2 where id=$1",
            [before.id, time],
          );
        const row = (
          await client.query<OverrideRow>(
            `insert into equipment.maintenance_frequency_overrides
          (account_id,scope,machine_id,component_catalog_id,activity_code,activity_type,
           frequency_value,frequency_unit,alert_lead_value,alert_lead_unit,factory_frequencies,
           warranty_warning_acknowledged_at,valid_from,actor_id,reason,row_version)
          values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,case when $12 then $13::timestamptz end,
            $13::timestamptz,$14,$15,$16) returning *`,
            [
              accountId,
              scope,
              machineId,
              target.componentCatalogId,
              target.activityCode,
              target.activityType,
              input.frequency.value,
              input.frequency.unit,
              input.alertLead?.value ?? null,
              input.alertLead?.unit ?? null,
              JSON.stringify(target.factory),
              warningRequired,
              time,
              op.userId,
              input.reason,
              before ? Number(before.row_version) + 1 : 1,
            ],
          )
        ).rows[0]!;
        await frequenciesChanged(
          client,
          op,
          scope,
          accountId,
          machineId ?? accountId,
          machineId ? [machineId] : await accountMachineIds(client, accountId),
          action === "create" ? "CREATE" : "UPDATE",
          input.reason,
          before ? [before] : [],
          [row],
        );
        return toOverride(row);
      },
    );
  }

  /** "Restore factory values": closes the matching overrides; nothing is deleted. */
  async reset(
    request: SecurityRequest,
    scope: FrequencyScope,
    machineId: string | null,
    body: unknown,
  ): Promise<ResetFrequencyOverridesResult> {
    const input = resetFrequencyOverridesSchema.parse(body);
    return this.db.run(
      request,
      this.operation(scope, machineId, "reset"),
      input,
      true,
      async (client, op) => {
        const machine = machineId ? await this.machine(client, machineId) : null;
        const accountId = machine?.account_id ?? op.accountId;
        await this.serialize(client, scope, accountId);
        const before = (await openOverrides(client, accountId, scope, machineId, true)).filter(
          (row) =>
            (input.componentCatalogId === undefined ||
              row.component_catalog_id === input.componentCatalogId) &&
            (input.activityCode === undefined || row.activity_code === input.activityCode),
        );
        if (before.length === 0) return { closed: [] };
        const closed = (
          await client.query<OverrideRow>(
            `update equipment.maintenance_frequency_overrides set valid_to=clock_timestamp()
          where id=any($1::uuid[]) returning *`,
            [before.map((row) => row.id)],
          )
        ).rows;
        await frequenciesChanged(
          client,
          op,
          scope,
          accountId,
          machineId ?? accountId,
          machineId ? [machineId] : await accountMachineIds(client, accountId),
          "RESET",
          input.reason,
          before,
          [],
        );
        return { closed: closed.map(toOverride) };
      },
    );
  }

  /** Machine writes run as machine-frequencies:<id>:… so EquipmentDatabase authorizes by branch. */
  private operation(scope: FrequencyScope, machineId: string | null, action: string): string {
    return scope === "MACHINE"
      ? `machine-frequencies:${machineId}:${action}`
      : `account-frequencies:${action}`;
  }

  /** The machine was locked and authorized by EquipmentDatabase.run. */
  private async machine(client: PoolClient, id: string): Promise<RecordRow> {
    const machine = await one(client, "select * from equipment.machines where id=$1", [id]);
    if (machine.operational_status === "retired")
      throw new ConflictException("Retired machines cannot be changed");
    return machine;
  }

  /**
   * Machine writes are serialized by the machine lock taken in run(); account writes take a
   * transaction lock per account so a concurrent edit sees the new version and gets 412.
   */
  private async serialize(client: PoolClient, scope: FrequencyScope, accountId: string) {
    if (scope === "ACCOUNT")
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
        `account-frequencies:${accountId}`,
      ]);
  }
}
