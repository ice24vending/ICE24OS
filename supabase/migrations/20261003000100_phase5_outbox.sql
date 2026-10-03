-- F5-05: transactional outbox. Events are stored in the producer's transaction;
-- publication is a separate migration so stores without PGMQ can still record them.
create schema if not exists infra;

create table infra.outbox_events (
  id uuid primary key default gen_random_uuid(),
  event_type varchar(120) not null check (event_type ~ '^[A-Z][A-Za-z0-9]+$'),
  event_version integer not null default 1 check (event_version > 0),
  aggregate_type varchar(80) not null check (length(trim(aggregate_type)) > 0),
  aggregate_id uuid not null,
  aggregate_version bigint not null default 0 check (aggregate_version >= 0),
  account_id uuid references identity.accounts(id),
  actor_type text not null check (actor_type in ('USER','SYSTEM','STRIPE')),
  actor_user_id uuid references identity.users(id),
  context_session_id uuid references identity.context_sessions(id),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  sensitivity varchar(20) not null check (sensitivity in ('public','internal','confidential','sensitive')),
  causation_id uuid,
  correlation_id uuid not null,
  occurred_at timestamptz not null,
  published_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  last_error_code varchar(200),
  created_at timestamptz not null default now(),
  check ((actor_type = 'USER' and actor_user_id is not null) or
    (actor_type in ('SYSTEM','STRIPE') and actor_user_id is null and context_session_id is null))
);
create index outbox_events_pending on infra.outbox_events (available_at, occurred_at, id)
  where published_at is null;
create index outbox_events_published on infra.outbox_events (published_at, occurred_at);
create index outbox_events_aggregate on infra.outbox_events (aggregate_type, aggregate_id, aggregate_version);
create index outbox_events_correlation on infra.outbox_events (correlation_id);

-- Event facts are immutable; only the publication bookkeeping may advance.
create function infra.protect_outbox_event() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'UPDATE' then
    raise exception using errcode = '55000', message = 'Outbox events are append-only';
  end if;
  if (to_jsonb(new) - array['published_at','attempt_count','available_at','last_error_code'])
     is distinct from (to_jsonb(old) - array['published_at','attempt_count','available_at','last_error_code'])
     or (old.published_at is not null and new.published_at is distinct from old.published_at)
     or new.attempt_count < old.attempt_count then
    raise exception using errcode = '55000', message = 'Outbox event facts are immutable';
  end if;
  return new;
end $$;
create trigger outbox_events_immutable before update or delete on infra.outbox_events
for each row execute function infra.protect_outbox_event();
create trigger outbox_events_no_truncate before truncate on infra.outbox_events
for each statement execute function infra.protect_outbox_event();

create function infra.outbox_event_type(raw text) returns text
language sql immutable set search_path = '' as $$
  select replace(initcap(replace(lower(raw), '_', ' ')), ' ', '')
$$;

-- Existing domain histories publish through the outbox inside the same transaction,
-- reusing the explicit F5-04 field allow-list so no raw payload leaves the producer.
create function infra.capture_outbox_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  kind text := 'USER'; actor uuid; context_id uuid; v_aggregate_type text; v_aggregate_id uuid;
  version bigint := 0; summary jsonb; level text := 'internal'; target_account uuid;
begin
  if tg_table_schema = 'subscriptions' then
    kind := new.actor_type; actor := new.actor_id; context_id := new.context_id;
    target_account := new.account_id; v_aggregate_type := 'Subscription'; v_aggregate_id := new.subscription_id;
    summary := audit.event_summary(new.new_state);
    version := coalesce((new.new_state ->> 'row_version')::bigint, 0);
  elsif tg_table_schema = 'equipment' then
    actor := new.actor_id; context_id := new.context_id; target_account := new.account_id;
    v_aggregate_type := case when new.event_type like 'MEMBER%' then 'Membership' else 'EquipmentResource' end;
    v_aggregate_id := new.resource_id;
    summary := audit.event_summary(new.after_data);
    version := coalesce((new.after_data ->> 'row_version')::bigint, 0);
  else
    actor := new.actor_user_id; context_id := new.context_session_id; target_account := new.account_id;
    v_aggregate_type := 'Identity'; v_aggregate_id := coalesce(new.subject_user_id, new.id);
    summary := coalesce(audit.event_summary(new.metadata), '{}'::jsonb) || jsonb_build_object('result', new.result);
    level := 'confidential';
    if actor is null then kind := 'SYSTEM'; end if;
  end if;
  if kind <> 'USER' then actor := null; context_id := null; end if;
  -- Legacy identity events can reference the subject's session instead of the actor's.
  if context_id is not null and not exists (select 1 from identity.context_sessions c
    where c.id = context_id and c.user_id = actor) then context_id := null; end if;
  insert into infra.outbox_events (id, event_type, aggregate_type, aggregate_id, aggregate_version,
    account_id, actor_type, actor_user_id, context_session_id, payload, sensitivity,
    correlation_id, occurred_at)
  values (new.id, infra.outbox_event_type(new.event_type), v_aggregate_type, v_aggregate_id, version,
    target_account, kind, actor, context_id, coalesce(summary, '{}'::jsonb), level,
    new.correlation_id, new.occurred_at);
  return new;
end $$;
create trigger subscription_outbox after insert on subscriptions.events
for each row execute function infra.capture_outbox_event();
create trigger equipment_outbox after insert on equipment.events
for each row execute function infra.capture_outbox_event();
create trigger identity_outbox after insert on audit.security_events
for each row execute function infra.capture_outbox_event();

alter table infra.outbox_events enable row level security;
revoke all on infra.outbox_events from public, anon, authenticated, service_role;
grant usage on schema infra to service_role;
grant select, insert on infra.outbox_events to service_role;
revoke all on function infra.protect_outbox_event(), infra.capture_outbox_event(),
  infra.outbox_event_type(text) from public, anon, authenticated;
