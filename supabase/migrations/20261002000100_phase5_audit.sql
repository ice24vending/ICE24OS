-- F5-04: additive central audit store. Existing domain histories remain intact.
create table audit.events (
  id uuid primary key default gen_random_uuid(),
  event_version integer not null default 1 check (event_version = 1),
  occurred_at_utc timestamptz not null,
  time_zone varchar(64) not null,
  occurred_at_local timestamp generated always as (occurred_at_utc at time zone time_zone) stored,
  actor_user_id uuid references identity.users(id),
  actor_type text not null check (actor_type in ('USER','SYSTEM','STRIPE')),
  context_session_id uuid references identity.context_sessions(id),
  account_id uuid references identity.accounts(id),
  branch_id uuid references equipment.branches(id),
  machine_id uuid references equipment.machines(id),
  entity_type varchar(80) not null check (length(trim(entity_type)) > 0),
  entity_id uuid not null,
  operation varchar(80) not null check (length(trim(operation)) > 0),
  previous_values jsonb,
  new_values jsonb,
  reason text,
  origin varchar(30) not null check (origin in ('WEB','API','WORKER','OFFLINE_SYNC','WEBHOOK','ADMIN')),
  ip_address inet,
  device_summary jsonb,
  result varchar(20) not null check (result in ('SUCCESS','DENIED','FAILED')),
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  check ((actor_type='USER' and actor_user_id is not null) or
    (actor_type in ('SYSTEM','STRIPE') and actor_user_id is null and context_session_id is null)),
  check (account_id is not null or (branch_id is null and machine_id is null)),
  check (previous_values is null or jsonb_typeof(previous_values)='object'),
  check (new_values is null or jsonb_typeof(new_values)='object'),
  check (device_summary is null or jsonb_typeof(device_summary)='object')
);
create index audit_events_account_time on audit.events(account_id,occurred_at_utc desc,id desc);
create index audit_events_time on audit.events(occurred_at_utc desc,id desc);
create index audit_events_actor_time on audit.events(actor_user_id,occurred_at_utc desc,id desc);
create index audit_events_machine_time on audit.events(machine_id,occurred_at_utc desc,id desc);
create index audit_events_entity_time on audit.events(entity_type,entity_id,occurred_at_utc desc,id desc);
create index audit_events_correlation on audit.events(correlation_id);

create function audit.reject_event_mutation() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception using errcode='55000', message='Audit events are append-only';
end $$;
create trigger audit_events_immutable before update or delete on audit.events
for each statement execute function audit.reject_event_mutation();
create trigger audit_events_no_truncate before truncate on audit.events
for each statement execute function audit.reject_event_mutation();

-- Validate captured tenant relationships at insertion time; subsequent transfers
-- must not rewrite historical ownership or scopes.
create function audit.validate_event_context() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.context_session_id is not null and not exists (
    select 1 from identity.context_sessions c where c.id=new.context_session_id and c.user_id=new.actor_user_id
  ) then raise exception using errcode='23514', message='Audit actor/context mismatch'; end if;
  if new.branch_id is not null and not exists (
    select 1 from equipment.branches b where b.id=new.branch_id and b.account_id=new.account_id
  ) then raise exception using errcode='23514', message='Audit branch/account mismatch'; end if;
  if new.machine_id is not null and not exists (
    select 1 from equipment.machines m where m.id=new.machine_id and m.account_id=new.account_id
      and (new.branch_id is null or m.branch_id=new.branch_id)
  ) then raise exception using errcode='23514', message='Audit machine/account mismatch'; end if;
  return new;
end $$;
create trigger audit_event_context before insert on audit.events
for each row execute function audit.validate_event_context();

alter table audit.events enable row level security;
revoke all on audit.events from public,anon,authenticated,service_role;
grant select,insert on audit.events to service_role;
revoke all on function audit.reject_event_mutation(),audit.validate_event_context() from public,anon,authenticated;

insert into authz.permissions(code,module_code,action_code,data_classification,description) values
('audit.read','audit','READ','RESTRICTED','Read audit in the authorized account and resource scope'),
('audit.global-read','audit','READ','RESTRICTED','Read global ICE24 audit');
insert into authz.role_permissions(role_id,permission_id,effect)
select r.id,p.id,'ALLOW' from authz.roles r cross join authz.permissions p
where (p.code='audit.read' and r.code in ('IA','OW','AU'))
   or (p.code='audit.global-read' and r.code='IA');
