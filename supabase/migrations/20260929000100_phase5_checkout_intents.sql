-- Durable reservation survives provider timeouts and preserves clean demo conversions.
create table subscriptions.checkout_intents (
  account_id uuid primary key references subscriptions.records(account_id),
  id uuid not null unique,
  digest text not null,
  created_at timestamptz not null default now(),
  response jsonb,
  expires_at timestamptz,
  check ((response is null) = (expires_at is null))
);
alter table subscriptions.checkout_intents enable row level security;
revoke all on subscriptions.checkout_intents from public,anon,authenticated;
grant select,insert,update on subscriptions.checkout_intents to service_role;
