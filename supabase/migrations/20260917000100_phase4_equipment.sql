-- F4: operational equipment registry. Browser roles have no direct access.
create schema if not exists equipment;
create extension if not exists btree_gist;

create function equipment.new_id() returns uuid language sql volatile set search_path = '' as $$
  select (lpad(to_hex(floor(extract(epoch from clock_timestamp()) * 1000)::bigint),12,'0')
    || '7' || substr(replace(gen_random_uuid()::text,'-',''),14,3)
    || substr(replace(gen_random_uuid()::text,'-',''),17,16))::uuid
$$;

alter table identity.accounts add column details jsonb not null default '{}'::jsonb;

create table equipment.branches (
  id uuid primary key default equipment.new_id(),
  account_id uuid not null references identity.accounts(id),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  status text not null default 'active' check(status in ('active','archived')),
  row_version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,account_id)
);
create table equipment.catalog_entries (
  id uuid primary key default equipment.new_id(),
  kind text not null check(kind in ('manufacturer','system','component','characteristic')),
  code text not null unique, data jsonb not null,
  status text not null default 'active' check(status in ('active','retired')),
  row_version integer not null default 1
);
create table equipment.technical_models (
  id uuid primary key default equipment.new_id(),
  manufacturer_id uuid not null references equipment.catalog_entries(id),
  code text not null unique, data jsonb not null,
  status text not null default 'active' check(status in ('active','retired')),
  row_version integer not null default 1
);
create table equipment.template_versions (
  id uuid primary key default equipment.new_id(),
  model_id uuid not null references equipment.technical_models(id),
  version_number integer not null,
  definition jsonb not null,
  status text not null default 'draft' check(status in ('draft','published','superseded')),
  published_at timestamptz,
  row_version integer not null default 1,
  unique(model_id,version_number), unique(id,model_id)
);
create function equipment.protect_template() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'Templates cannot be deleted'; end if;
  if old.status <> 'draft' and (new.definition <> old.definition or new.model_id <> old.model_id
    or new.version_number <> old.version_number or new.status <> 'superseded') then
    raise exception 'Published templates are immutable';
  end if;
  return new;
end $$;
create trigger template_immutable before update or delete on equipment.template_versions
for each row execute function equipment.protect_template();

create table equipment.files (
  id uuid primary key default equipment.new_id(), account_id uuid not null references identity.accounts(id),
  uploaded_by uuid not null references identity.users(id), filename text not null,
  content_type text not null check(content_type in ('image/jpeg','image/png','application/pdf')),
  byte_size integer not null check(byte_size between 1 and 5242880), sha256 text not null,
  object_key text not null unique,
  status text not null default 'quarantine' check(status in ('quarantine','clean','rejected')),
  scan_reference text, created_at timestamptz not null default now()
);
create table equipment.folio_counters (
  account_id uuid not null references identity.accounts(id), domain text not null, year integer not null,
  sequence integer not null check(sequence between 1 and 999999), primary key(account_id,domain,year)
);
create function equipment.next_folio(p_account uuid,p_domain text) returns text
language plpgsql set search_path = '' as $$
declare y integer := extract(year from current_timestamp); n integer;
begin
  if p_domain not in ('EQP','TRF') then raise exception 'Unsupported folio domain'; end if;
  insert into equipment.folio_counters values(p_account,p_domain,y,1)
  on conflict(account_id,domain,year) do update set sequence=equipment.folio_counters.sequence+1 returning sequence into n;
  return p_domain||'-'||y||'-'||lpad(n::text,6,'0');
end $$;
create table equipment.requests (
  id uuid primary key default equipment.new_id(), account_id uuid not null references identity.accounts(id),
  branch_id uuid not null, folio text not null, data jsonb not null,
  status text not null default 'draft' check(status in ('draft','submitted','in_review','information_required','rejected','active')),
  review jsonb, row_version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(branch_id,account_id) references equipment.branches(id,account_id), unique(account_id,folio)
);
create table equipment.machines (
  id uuid primary key default equipment.new_id(), machine_code text not null unique,
  request_id uuid not null unique references equipment.requests(id),
  account_id uuid not null references identity.accounts(id), branch_id uuid not null,
  model_id uuid not null references equipment.technical_models(id), template_id uuid not null,
  data jsonb not null, operational_status text not null check(operational_status in ('available','off','maintenance','out_of_service','suspended','retired')),
  technical_status text not null default 'preventive_attention' check(technical_status in ('optimal','preventive_attention','attention_required','critical')),
  sanitary_status text not null default 'attention_required' check(sanitary_status in ('up_to_date','expiring_soon','attention_required','corrective_action','restricted')),
  publication_status text not null default 'private' check(publication_status in ('private','pending','published','withdrawn')),
  row_version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(branch_id,account_id) references equipment.branches(id,account_id),
  foreign key(template_id,model_id) references equipment.template_versions(id,model_id)
);
create function equipment.protect_machine() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'Machines cannot be deleted'; end if;
  if new.machine_code <> old.machine_code or new.request_id <> old.request_id or new.model_id <> old.model_id then
    raise exception 'Machine identity is immutable';
  end if;
  if old.operational_status='retired' and new.operational_status <> 'retired' then raise exception 'Retirement is final'; end if;
  return new;
end $$;
create trigger machine_immutable before update or delete on equipment.machines for each row execute function equipment.protect_machine();

create table equipment.machine_periods (
  id uuid primary key default equipment.new_id(), machine_id uuid not null references equipment.machines(id),
  kind text not null check(kind in ('ownership','location','template')),
  reference_id uuid not null, valid_from timestamptz not null, valid_to timestamptz,
  actor_id uuid not null references identity.users(id), reason text not null,
  check(valid_to is null or valid_to > valid_from),
  exclude using gist(machine_id with =, kind with =, tstzrange(valid_from,valid_to,'[)') with &&)
);
create table equipment.transfers (
  id uuid primary key default equipment.new_id(), machine_id uuid not null references equipment.machines(id),
  account_id uuid not null references identity.accounts(id), to_account_id uuid not null references identity.accounts(id),
  to_branch_id uuid not null, folio text not null, data jsonb not null,
  status text not null default 'pending' check(status in ('pending','approved','executed','rejected','cancelled')),
  machine_version integer not null, row_version integer not null default 1,
  created_at timestamptz not null default now(), executed_at timestamptz,
  check(account_id <> to_account_id), foreign key(to_branch_id,to_account_id) references equipment.branches(id,account_id),
  unique(account_id,folio)
);
create unique index one_pending_transfer on equipment.transfers(machine_id) where status in ('pending','approved');
create table equipment.scheduled_activities (
  id uuid primary key default equipment.new_id(), machine_id uuid not null references equipment.machines(id),
  template_id uuid not null references equipment.template_versions(id), activity_code text not null,
  definition jsonb not null, due_at timestamptz,
  status text not null default 'pending' check(status in ('pending','in_progress','completed','cancelled')),
  generation_key text not null, created_at timestamptz not null default now(),
  unique(machine_id,generation_key,activity_code)
);
create table equipment.schedule_jobs (
  id uuid primary key default equipment.new_id(), machine_id uuid not null references equipment.machines(id),
  template_id uuid not null references equipment.template_versions(id), effective_at timestamptz not null default now(),
  status text not null default 'pending' check(status in ('pending','completed','failed')),
  attempts integer not null default 0, last_error text, created_at timestamptz not null default now()
);
create function equipment.protect_history() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op='DELETE' then raise exception 'History cannot be deleted'; end if;
  if tg_table_name='machine_periods' then
    if (to_jsonb(new) - 'valid_to') <> (to_jsonb(old) - 'valid_to') or old.valid_to is not null or new.valid_to is null then
      raise exception 'Only closing an open period is allowed';
    end if;
  elsif new.definition <> old.definition or new.template_id <> old.template_id or new.machine_id <> old.machine_id
    or new.activity_code <> old.activity_code or new.generation_key <> old.generation_key or new.due_at is distinct from old.due_at then
    raise exception 'Scheduled definitions are immutable';
  end if;
  return new;
end $$;
create trigger protect_periods before update or delete on equipment.machine_periods for each row execute function equipment.protect_history();
create trigger protect_schedule_definition before update or delete on equipment.scheduled_activities for each row execute function equipment.protect_history();
create table equipment.events (
  id uuid primary key default equipment.new_id(), account_id uuid references identity.accounts(id),
  resource_id uuid not null, actor_id uuid not null references identity.users(id), context_id uuid not null references identity.context_sessions(id),
  correlation_id uuid not null, event_type text not null, reason text not null,
  before_data jsonb, after_data jsonb, occurred_at timestamptz not null default now()
);
create function equipment.append_only() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Append-only evidence'; end $$;
create trigger immutable_events before update or delete on equipment.events for each row execute function equipment.append_only();
create table equipment.idempotency (
  actor_id uuid not null references identity.users(id), account_id uuid not null references identity.accounts(id),
  operation text not null, key text not null, digest text not null, response jsonb not null,
  primary key(actor_id,account_id,operation,key), created_at timestamptz not null default now()
);
create index branches_account on equipment.branches(account_id);
create index requests_account on equipment.requests(account_id,created_at);
create index machines_account on equipment.machines(account_id,branch_id);
create index events_resource on equipment.events(resource_id,occurred_at);
create index schedules_machine on equipment.scheduled_activities(machine_id,due_at);

create function equipment.validate_scope() returns trigger language plpgsql set search_path = '' as $$
declare account uuid;
begin
  if new.valid_to is not null then return new; end if;
  select account_id into account from identity.account_memberships where id=new.membership_id;
  if new.scope_type='BRANCH' and not exists(select 1 from equipment.branches where id=new.branch_id and account_id=account and status='active') then
    raise exception 'Branch scope does not belong to membership account' using errcode='23514';
  end if;
  if new.scope_type='MACHINE' and not exists(select 1 from equipment.machines where id=new.machine_id and account_id=account and operational_status<>'retired') then
    raise exception 'Machine scope does not belong to membership account' using errcode='23514';
  end if;
  return new;
end $$;
create trigger validate_equipment_scope before insert or update on authz.user_scopes
for each row execute function equipment.validate_scope();

insert into authz.permissions(code,module_code,action_code,data_classification,description) values
('equipment.read','equipment','READ','CONFIDENTIAL','Read authorized equipment and branches'),
('equipment.manage','equipment','MANAGE','CONFIDENTIAL','Manage account equipment and branches'),
('equipment.admin','equipment','ADMIN','RESTRICTED','Platform catalog, approval and transfer administration');
insert into authz.role_permissions(role_id,permission_id,effect)
select r.id,p.id,'ALLOW' from authz.roles r cross join authz.permissions p
where (p.code='equipment.read' and r.code in ('IA','IO','OW','TC','OP','SA','AU'))
 or (p.code='equipment.manage' and r.code in ('IA','IO','OW'))
 or (p.code='equipment.admin' and r.code in ('IA','IO'));

do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='equipment' loop
   execute format('alter table equipment.%I enable row level security',t.tablename);
 end loop;
end $$;
revoke all on schema equipment from public, anon, authenticated;
revoke all on all tables in schema equipment from public, anon, authenticated;
revoke all on all functions in schema equipment from public, anon, authenticated;
grant usage on schema equipment to service_role;
grant select,insert,update on all tables in schema equipment to service_role;
revoke update on equipment.events from service_role;
grant execute on all functions in schema equipment to service_role;
