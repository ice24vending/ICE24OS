-- TASK-F4-19 (RA-01, RF-TPL-014): per-machine component configuration with history.
-- Each row is one version of the configuration of a component on a machine; a change closes
-- the open version (valid_to) and inserts the next one with row_version + 1. Rows are never
-- deleted and versions of the same component never overlap.
--
-- Expected duration: new empty table, indexes and one permission; seconds.
--
-- Reversal (operational, documented in docs/tasks/task-f4-19.md): prefer a forward fix. If
-- needed before any machine is activated with F4-19:
--   drop table equipment.machine_component_configs;
--   drop function equipment.validate_component_config(), equipment.protect_component_config();
--   delete from authz.role_permissions where permission_id in
--     (select id from authz.permissions where code='equipment.machine-components-manage');
--   delete from authz.permissions where code='equipment.machine-components-manage';
-- Once rows exist the table is technical history and must be kept.

create table equipment.machine_component_configs (
  id uuid primary key default equipment.new_id(),
  machine_id uuid not null references equipment.machines(id),
  component_catalog_id uuid not null references equipment.catalog_entries(id),
  origin text not null check (origin in ('TEMPLATE_DEFAULT','TEMPLATE_OPTIONAL','ACCOUNT_CUSTOM')),
  status text not null check (status in ('active','inactive')),
  valid_from timestamptz not null,
  valid_to timestamptz,
  actor_id uuid not null references identity.users(id),
  reason text not null check (length(btrim(reason)) between 1 and 2000),
  row_version integer not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from),
  exclude using gist (
    machine_id with =, component_catalog_id with =, tstzrange(valid_from, valid_to, '[)') with &&
  )
);
comment on table equipment.machine_component_configs is
  'Versioned component configuration per machine (F4-19). Travels with the machine on transfer.';
-- One open version per machine and component; also the lookup for the current configuration.
create unique index machine_component_configs_open
  on equipment.machine_component_configs(machine_id, component_catalog_id) where valid_to is null;
create index machine_component_configs_history
  on equipment.machine_component_configs(machine_id, valid_from);
create index machine_component_configs_component
  on equipment.machine_component_configs(component_catalog_id);

-- A configuration references a component that is official or owned by the machine's account,
-- and its origin matches the scope. Checked on insert: a transfer keeps earlier versions.
create function equipment.validate_component_config() returns trigger
language plpgsql set search_path = '' as $$
declare entry record; machine_account uuid;
begin
  select kind, scope, account_id into entry from equipment.catalog_entries where id = new.component_catalog_id;
  select account_id into machine_account from equipment.machines where id = new.machine_id;
  if entry.kind is distinct from 'component' then
    raise exception 'Only catalog components can be configured on a machine' using errcode = '23514';
  end if;
  if entry.scope = 'ACCOUNT' and entry.account_id is distinct from machine_account then
    raise exception 'Component belongs to another account' using errcode = '23514';
  end if;
  if (entry.scope = 'ACCOUNT') <> (new.origin = 'ACCOUNT_CUSTOM') then
    raise exception 'Origin does not match the component scope' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger component_config_valid before insert on equipment.machine_component_configs
for each row execute function equipment.validate_component_config();

-- History: no deletion; the only update is closing an open version.
create function equipment.protect_component_config() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'History cannot be deleted'; end if;
  if (to_jsonb(new) - 'valid_to') <> (to_jsonb(old) - 'valid_to') or old.valid_to is not null or new.valid_to is null then
    raise exception 'Only closing an open component configuration is allowed';
  end if;
  return new;
end $$;
create trigger component_config_history before update or delete on equipment.machine_component_configs
for each row execute function equipment.protect_component_config();

-- RA-01-D2 (extended by #29): the owner on any machine, the Operator only on machines of its
-- branches. The branch restriction is evaluated with the BRANCH scope of @ice24/authorization.
insert into authz.permissions(code,module_code,action_code,data_classification,description) values
('equipment.machine-components-manage','equipment','MANAGE','CONFIDENTIAL','Choose and activate the components configured on authorized machines');
insert into authz.role_permissions(role_id,permission_id,effect)
select r.id,p.id,'ALLOW' from authz.roles r join authz.permissions p on p.code='equipment.machine-components-manage'
where r.code in ('OW','OP');

alter table equipment.machine_component_configs enable row level security;
revoke all on equipment.machine_component_configs from public, anon, authenticated;
revoke all on function equipment.validate_component_config(), equipment.protect_component_config()
  from public, anon, authenticated;
grant select, insert, update on equipment.machine_component_configs to service_role;
grant execute on function equipment.validate_component_config(), equipment.protect_component_config()
  to service_role;
