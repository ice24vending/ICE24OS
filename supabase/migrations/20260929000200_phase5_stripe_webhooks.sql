create table subscriptions.stripe_webhooks (
  provider_event_id varchar(255) primary key,
  event_type varchar(100) not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  last_received_at timestamptz not null default now(),
  correlation_id uuid not null,
  payload_hash char(64) not null,
  raw_body bytea not null,
  event jsonb not null,
  status text not null default 'RECEIVED' check(status in ('RECEIVED','APPLIED','IGNORED','FAILED')),
  deliveries integer not null default 1,
  attempts integer not null default 0,
  processed_at timestamptz,
  error_code text,
  account_id uuid references identity.accounts(id)
);
create index stripe_webhooks_recovery on subscriptions.stripe_webhooks(status,received_at);
alter table subscriptions.stripe_webhooks enable row level security;
revoke all on subscriptions.stripe_webhooks from public,anon,authenticated;
grant select,insert,update on subscriptions.stripe_webhooks to service_role;

create function subscriptions.protect_webhook() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' then raise exception 'Webhook evidence is immutable'; end if;
  if new.provider_event_id<>old.provider_event_id or new.event<>old.event or new.payload_hash<>old.payload_hash or new.raw_body<>old.raw_body
    or new.event_type<>old.event_type or new.occurred_at<>old.occurred_at
    or new.received_at<>old.received_at or new.correlation_id<>old.correlation_id then
    raise exception 'Webhook evidence is immutable';
  end if;
  return new;
end $$;
create trigger stripe_webhook_evidence before update or delete on subscriptions.stripe_webhooks
for each row execute function subscriptions.protect_webhook();
revoke all on function subscriptions.protect_webhook() from public,anon,authenticated;

-- A provider event must not impersonate a human user or browser session.
alter table subscriptions.events alter column actor_id drop not null;
alter table subscriptions.events alter column context_id drop not null;
alter table subscriptions.events add column actor_type text not null default 'USER';
alter table subscriptions.events add column provider_event_id varchar(255) unique
  references subscriptions.stripe_webhooks(provider_event_id);
alter table subscriptions.events add constraint subscription_event_actor check (
  (actor_type='USER' and actor_id is not null and context_id is not null and provider_event_id is null)
  or (actor_type='STRIPE' and actor_id is null and context_id is null and provider_event_id is not null)
);
alter table subscriptions.records alter column updated_by drop not null;
create unique index subscription_customer_unique on subscriptions.records(provider_customer_id)
where provider_customer_id is not null;
