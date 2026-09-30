-- F5-01. Additive schema; no existing account is enrolled or charged by this migration.
create schema subscriptions;
create table subscriptions.records (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references identity.accounts(id),
  provider text not null default 'stripe' check(provider='stripe'),
  provider_customer_id varchar(255),
  provider_subscription_id varchar(255) unique,
  plan_code varchar(80) not null default 'ICE24_MONTHLY',
  amount_minor bigint not null default 39900 check(amount_minor between 0 and 9007199254740991),
  currency_code text not null default 'MXN' check(currency_code='MXN'),
  status text not null check(status in ('demo','pending_activation','active','payment_failed','read_only','cancellation_scheduled','cancelled','reactivated')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  is_demo boolean not null,
  demo_expires_at timestamptz,
  row_version integer not null default 1 check(row_version>0),
  created_by uuid not null references identity.users(id),
  updated_by uuid not null references identity.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,account_id),
  check(length(trim(plan_code))>0),
  check(provider_customer_id is null or length(trim(provider_customer_id))>0),
  check(provider_subscription_id is null or length(trim(provider_subscription_id))>0),
  check(is_demo=(demo_expires_at is not null)),
  check((is_demo and status in ('demo','read_only')) or (not is_demo and status<>'demo')),
  check(cancel_at_period_end=(status='cancellation_scheduled')),
  check((current_period_start is null)=(current_period_end is null)),
  check(current_period_end>current_period_start),
  check(status not in ('active','reactivated','payment_failed','cancellation_scheduled','cancelled') or
    (provider_customer_id is not null and provider_subscription_id is not null and current_period_end is not null))
);
create index subscriptions_due on subscriptions.records(status,demo_expires_at,current_period_end);
create table subscriptions.events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null,
  account_id uuid not null,
  actor_id uuid not null references identity.users(id),
  context_id uuid not null references identity.context_sessions(id),
  correlation_id uuid not null,
  event_type text not null,
  reason text not null check(length(trim(reason))>=10),
  previous_state jsonb,
  new_state jsonb not null,
  occurred_at timestamptz not null default now(),
  foreign key(subscription_id,account_id) references subscriptions.records(id,account_id)
);
create index subscription_event_history on subscriptions.events(account_id,subscription_id,occurred_at desc);
create table subscriptions.idempotency (
  actor_id uuid not null references identity.users(id),
  context_account_id uuid not null references identity.accounts(id),
  operation text not null,
  key text not null,
  digest text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key(actor_id,context_account_id,operation,key)
);
create table subscriptions.demo_conversions (
  demo_account_id uuid primary key references subscriptions.records(account_id),
  production_account_id uuid not null unique references subscriptions.records(account_id),
  created_at timestamptz not null default now(),
  check(demo_account_id<>production_account_id)
);
create function subscriptions.protect_record() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' then raise exception 'Subscriptions preserve history'; end if;
  if new.id<>old.id or new.account_id<>old.account_id or new.is_demo<>old.is_demo or new.created_at<>old.created_at or new.created_by<>old.created_by
    then raise exception 'Subscription identity is immutable'; end if;
  if new.row_version<>old.row_version+1 then raise exception 'Subscription version must advance'; end if;
  return new;
end $$;
create function subscriptions.validate_conversion() returns trigger language plpgsql set search_path='' as $$
begin
  if not exists(select 1 from subscriptions.records where account_id=new.demo_account_id and is_demo)
    or not exists(select 1 from subscriptions.records where account_id=new.production_account_id and not is_demo) then
    raise exception 'Conversion requires separate demo and production accounts' using errcode='23514';
  end if;
  return new;
end $$;
create trigger valid_demo_conversion before insert on subscriptions.demo_conversions
for each row execute function subscriptions.validate_conversion();
create trigger subscription_history before update or delete on subscriptions.records
for each row execute function subscriptions.protect_record();
create function subscriptions.append_only() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Subscription evidence is append-only'; end $$;
create trigger subscription_events_immutable before update or delete on subscriptions.events
for each row execute function subscriptions.append_only();
create trigger subscription_conversions_immutable before update or delete on subscriptions.demo_conversions
for each row execute function subscriptions.append_only();

-- Public module boundary: subscription accounts belong to identity. Existing users only;
-- inviting a new identity remains the F3 invitation workflow.
create function identity.provision_subscription_account(p_id uuid,p_name text,p_type text,p_owner uuid)
returns uuid language plpgsql set search_path='' as $$
declare membership uuid;
begin
  if not exists(select 1 from identity.users where id=p_owner and status='ACTIVE') then
    raise exception 'Active owner required' using errcode='23514';
  end if;
  insert into identity.accounts(id,name,account_type,access_mode) values(p_id,p_name,p_type,'READ_ONLY');
  insert into identity.account_memberships(account_id,user_id,status,is_primary_owner)
    values(p_id,p_owner,'ACTIVE',true) returning id into membership;
  insert into authz.membership_roles(membership_id,role_id) select membership,id from authz.roles where code='OW';
  insert into authz.user_scopes(membership_id,scope_type) values(membership,'ACCOUNT');
  return p_id;
end $$;
create function identity.apply_subscription_access(p_account uuid,p_mode text) returns void
language plpgsql set search_path='' as $$
begin
  if p_mode not in ('ACTIVE','READ_ONLY') then raise exception 'Invalid commercial access mode'; end if;
  -- A commercial payment must never lift a security suspension.
  update identity.accounts set access_mode=p_mode,row_version=row_version+1,updated_at=now()
  where id=p_account and access_mode<>'SUSPENDED' and access_mode<>p_mode;
end $$;

create function subscriptions.effective_access(p_account uuid,p_base text) returns text
language sql stable set search_path='' as $$
  select case when p_base<>'ACTIVE' then p_base
    when s.status in ('pending_activation','payment_failed','read_only','cancelled') then 'READ_ONLY'
    when s.is_demo and s.demo_expires_at<=now() then 'READ_ONLY'
    when s.status='cancellation_scheduled' and s.current_period_end<=now() then 'READ_ONLY'
    else p_base end
  from (select 1) singleton left join subscriptions.records s on s.account_id=p_account
$$;
create function identity.lock_subscription_account(p_account uuid) returns void language plpgsql set search_path='' as $$
begin perform id from identity.accounts where id=p_account for update; end $$;

insert into authz.permissions(code,module_code,action_code,data_classification,description) values
('subscriptions.read','subscriptions','READ','CONFIDENTIAL','Read subscription of the active account'),
('subscriptions.admin','subscriptions','ADMIN','RESTRICTED','Provision and extend isolated demo accounts');
insert into authz.role_permissions(role_id,permission_id,effect)
select r.id,p.id,'ALLOW' from authz.roles r cross join authz.permissions p
where (p.code='subscriptions.read' and r.code in ('IA','IO','OW'))
or (p.code='subscriptions.admin' and r.code='IA');

create function subscriptions.demo_context(p_account uuid) returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('isDemo',coalesce(s.is_demo,false),'demoExpiresAt',s.demo_expires_at)
  from (select 1) singleton left join subscriptions.records s on s.account_id=p_account
$$;

alter table subscriptions.records enable row level security;
alter table subscriptions.events enable row level security;
alter table subscriptions.idempotency enable row level security;
alter table subscriptions.demo_conversions enable row level security;
revoke all on schema subscriptions from public,anon,authenticated;
revoke all on all tables in schema subscriptions from public,anon,authenticated;
revoke all on all functions in schema subscriptions from public,anon,authenticated;
revoke all on function identity.provision_subscription_account(uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function identity.apply_subscription_access(uuid,text) from public,anon,authenticated;
revoke all on function identity.lock_subscription_account(uuid) from public,anon,authenticated;
grant usage on schema subscriptions to service_role;
grant select,insert,update on subscriptions.records to service_role;
grant select,insert on subscriptions.events,subscriptions.idempotency,subscriptions.demo_conversions to service_role;
grant execute on function subscriptions.effective_access(uuid,text) to service_role;
grant execute on function subscriptions.demo_context(uuid) to service_role;
grant execute on function identity.provision_subscription_account(uuid,text,text,uuid) to service_role;
grant execute on function identity.apply_subscription_access(uuid,text) to service_role;
grant execute on function identity.lock_subscription_account(uuid) to service_role;
