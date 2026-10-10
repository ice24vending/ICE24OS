-- TASK-F4-20 (RA-01, RF-TPL-015): client maintenance and sanitation frequencies.
-- The ICE24 template keeps the factory values; an override is one version of the client's
-- value for an activity, per account (ACCOUNT) or per machine (MACHINE). Editing closes the
-- open version and inserts the next one; "restore factory values" only closes it. Rows are
-- never deleted, so the factory snapshot and the client's values stay for warranty review.
--
-- Expected duration: new empty table, indexes and two permissions; seconds.
--
-- Reversal (operational, documented in docs/tasks/task-f4-20.md): prefer a forward fix. If
-- needed before any override exists:
--   drop table equipment.maintenance_frequency_overrides;
--   drop function equipment.validate_frequency_override(), equipment.protect_frequency_override();
--   delete from authz.role_permissions where permission_id in (select id from authz.permissions
--     where code in ('equipment.machine-frequencies-manage','equipment.account-frequencies-manage'));
--   delete from authz.permissions
--     where code in ('equipment.machine-frequencies-manage','equipment.account-frequencies-manage');
-- Once rows exist the table is warranty evidence and must be kept.

create table equipment.maintenance_frequency_overrides (
  id uuid primary key default equipment.new_id(),
  account_id uuid not null references identity.accounts(id),
  scope text not null check (scope in ('ACCOUNT','MACHINE')),
  machine_id uuid references equipment.machines(id),
  -- Set when the activity belongs to a catalog component (RA-01-D3); null for template activities.
  component_catalog_id uuid references equipment.catalog_entries(id),
  activity_code text not null check (activity_code ~ '^[A-Z0-9_-]{2,40}$'),
  activity_type text not null check (activity_type in ('MAINTENANCE','SANITATION')),
  frequency_value integer not null check (frequency_value > 0),
  frequency_unit text not null check (frequency_unit in ('days','weeks','months')),
  alert_lead_value integer check (alert_lead_value > 0),
  alert_lead_unit text check (alert_lead_unit in ('days','weeks','months')),
  -- Factory values in force when the override was recorded: [{value,unit}], one per template.
  factory_frequencies jsonb not null check (jsonb_typeof(factory_frequencies) = 'array'),
  -- RA-01-D1: explicit acknowledgement of the possible warranty loss, when it was required.
  warranty_warning_acknowledged_at timestamptz,
  valid_from timestamptz not null,
  valid_to timestamptz,
  actor_id uuid not null references identity.users(id),
  reason text not null check (length(btrim(reason)) between 1 and 2000),
  row_version integer not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  check ((scope = 'MACHINE') = (machine_id is not null)),
  check ((alert_lead_value is null) = (alert_lead_unit is null)),
  check (valid_to is null or valid_to > valid_from),
  exclude using gist (
    account_id with =, scope with =,
    (coalesce(machine_id, '00000000-0000-0000-0000-000000000000'::uuid)) with =,
    (coalesce(component_catalog_id, '00000000-0000-0000-0000-000000000000'::uuid)) with =,
    activity_code with =, tstzrange(valid_from, valid_to, '[)') with &&
  )
);
comment on table equipment.maintenance_frequency_overrides is
  'Versioned client frequencies (F4-20). Effective value: machine, then account, then template.';
-- One open version per target; also the lookup for the effective frequencies.
create unique index maintenance_frequency_overrides_open
  on equipment.maintenance_frequency_overrides(account_id, scope,
    coalesce(machine_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(component_catalog_id, '00000000-0000-0000-0000-000000000000'::uuid), activity_code)
  where valid_to is null;
create index maintenance_frequency_overrides_machine
  on equipment.maintenance_frequency_overrides(machine_id, valid_from) where machine_id is not null;
create index maintenance_frequency_overrides_component
  on equipment.maintenance_frequency_overrides(component_catalog_id) where component_catalog_id is not null;

-- A machine override belongs to the machine's account; a component is a catalog component that
-- is official or owned by the same account. Checked on insert: a transfer keeps earlier versions.
create function equipment.validate_frequency_override() returns trigger
language plpgsql set search_path = '' as $$
declare entry record; machine_account uuid;
begin
  if new.machine_id is not null then
    select account_id into machine_account from equipment.machines where id = new.machine_id;
    if machine_account is distinct from new.account_id then
      raise exception 'Machine belongs to another account' using errcode = '23514';
    end if;
  end if;
  if new.component_catalog_id is not null then
    select kind, scope, account_id into entry from equipment.catalog_entries where id = new.component_catalog_id;
    if entry.kind is distinct from 'component' then
      raise exception 'Only catalog components define frequencies' using errcode = '23514';
    end if;
    if entry.scope = 'ACCOUNT' and entry.account_id is distinct from new.account_id then
      raise exception 'Component belongs to another account' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger frequency_override_valid before insert on equipment.maintenance_frequency_overrides
for each row execute function equipment.validate_frequency_override();

-- History: no deletion; the only update is closing an open version.
create function equipment.protect_frequency_override() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'History cannot be deleted'; end if;
  if (to_jsonb(new) - 'valid_to') <> (to_jsonb(old) - 'valid_to') or old.valid_to is not null or new.valid_to is null then
    raise exception 'Only closing an open frequency override is allowed';
  end if;
  return new;
end $$;
create trigger frequency_override_history before update or delete on equipment.maintenance_frequency_overrides
for each row execute function equipment.protect_frequency_override();

-- RA-01-D2 (extended by #29): account frequencies only by the owner; machine frequencies by the
-- owner on any machine and by the Operator on machines of its branches (BRANCH scope).
insert into authz.permissions(code,module_code,action_code,data_classification,description) values
('equipment.account-frequencies-manage','equipment','MANAGE','CONFIDENTIAL','Define the maintenance and sanitation frequencies of the whole account'),
('equipment.machine-frequencies-manage','equipment','MANAGE','CONFIDENTIAL','Define the maintenance and sanitation frequencies of authorized machines');
insert into authz.role_permissions(role_id,permission_id,effect)
select r.id,p.id,'ALLOW' from authz.roles r join authz.permissions p
  on (p.code='equipment.account-frequencies-manage' and r.code='OW')
  or (p.code='equipment.machine-frequencies-manage' and r.code in ('OW','OP'));

alter table equipment.maintenance_frequency_overrides enable row level security;
revoke all on equipment.maintenance_frequency_overrides from public, anon, authenticated;
revoke all on function equipment.validate_frequency_override(), equipment.protect_frequency_override()
  from public, anon, authenticated;
grant select, insert, update on equipment.maintenance_frequency_overrides to service_role;
grant execute on function equipment.validate_frequency_override(), equipment.protect_frequency_override()
  to service_role;
