-- F5-14: integration logs with end-to-end correlation (PRD RF-ADM-009, RF-AUD-004, RF-AUD-008,
-- RNF-OBS-002, RNF-OBS-003; TRD 52.2 technical logs and 54 forbidden data).
-- One row per call to, or delivery from, an external system: Stripe, email, object storage,
-- queue deliveries, antimalware and (when it exists) PDF generation. Rows are technical logs,
-- not business audit (Database: audit stays in audit.events). Details are redacted by the
-- writer and checked again here: no URLs, signed paths, secrets, tokens or nested payloads.
-- Retries do not duplicate rows: (integration, operation, effect_key, attempt) is unique, so a
-- repeated attempt is ignored and each new attempt is its own row.
-- Retention is configurable (RF-AUD-008) and has no default: purging only runs when operation
-- configures a period (PRD question 92 / DEC-008 still open).
-- Additive migration: new table, functions and permission.

create table infra.integration_logs (
  id uuid primary key default gen_random_uuid(),
  integration varchar(30) not null
    check (integration in ('stripe','email','object_storage','queue','antimalware','pdf')),
  operation varchar(80) not null check (operation ~ '^[a-z][a-z0-9_.:-]{1,79}$'),
  direction varchar(10) not null check (direction in ('OUTBOUND','INBOUND')),
  provider varchar(40) not null check (provider ~ '^[a-z][a-z0-9-]{1,39}$'),
  status varchar(20) not null check (status in ('SUCCEEDED','FAILED')),
  latency_ms integer not null check (latency_ms >= 0),
  response_code varchar(40) check (response_code is null or response_code ~ '^[A-Za-z0-9_.:-]{1,40}$'),
  error_code varchar(80) check (error_code is null or error_code ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  retryable boolean,
  attempt integer not null default 1 check (attempt between 1 and 1000),
  effect_key varchar(200) check (effect_key is null or length(effect_key) between 1 and 200),
  correlation_id uuid not null,
  request_correlation_id uuid,
  -- No foreign key: a log must be storable even when the account hint of a call is wrong.
  account_id uuid,
  job_id uuid,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  check ((status = 'FAILED') = (error_code is not null)),
  check (jsonb_typeof(details) = 'object' and pg_column_size(details) <= 4096
    and not jsonb_path_exists(details, '$.* ? (@.type() == "object" || @.type() == "array")')),
  -- Defense in depth for TRD 54: files stay private, credentials never reach the store.
  constraint integration_logs_no_sensitive check (
    (details::text || ' ' || coalesce(effect_key, '')) !~*
      '([a-z][a-z0-9+.-]*://|/object/(upload/)?sign/|(sk|rk|pk)_(live|test)_|whsec_|bearer[[:space:]]|eyJ[A-Za-z0-9_-]{8,}\.)'
  )
);
create unique index integration_logs_effect_attempt
  on infra.integration_logs (integration, operation, effect_key, attempt) where effect_key is not null;
create index integration_logs_correlation on infra.integration_logs (correlation_id, occurred_at, id);
create index integration_logs_request_correlation on infra.integration_logs (request_correlation_id)
  where request_correlation_id is not null;
create index integration_logs_integration_time on infra.integration_logs (integration, occurred_at desc, id desc);
create index integration_logs_account_time on infra.integration_logs (account_id, occurred_at desc, id desc);
create index integration_logs_time on infra.integration_logs (occurred_at desc, id desc);
create index integration_logs_failures on infra.integration_logs (occurred_at desc) where status = 'FAILED';

-- Append-only, except the retention purge below.
create function infra.guard_integration_log() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and current_setting('ice24.integration_log_purge', true) = 'on' then
    return old;
  end if;
  raise exception using errcode = '55000', message = 'Integration logs are append-only';
end $$;
create trigger integration_logs_append_only before update or delete on infra.integration_logs
for each row execute function infra.guard_integration_log();
create trigger integration_logs_no_truncate before truncate on infra.integration_logs
for each statement execute function infra.reject_job_history_mutation();

-- Records one call. Returns false when the same effect and attempt is already recorded.
create function infra.record_integration_log(
  p_integration text, p_operation text, p_direction text, p_provider text, p_status text,
  p_latency_ms integer, p_response_code text, p_error_code text, p_retryable boolean,
  p_attempt integer, p_effect_key text, p_correlation_id uuid, p_request_correlation_id uuid,
  p_account_id uuid, p_job_id uuid, p_details jsonb, p_occurred_at timestamptz
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  inserted integer;
begin
  insert into infra.integration_logs (integration, operation, direction, provider, status,
    latency_ms, response_code, error_code, retryable, attempt, effect_key, correlation_id,
    request_correlation_id, account_id, job_id, details, occurred_at)
  values (p_integration, p_operation, p_direction, p_provider, p_status, p_latency_ms,
    p_response_code, p_error_code, p_retryable, coalesce(p_attempt, 1), p_effect_key,
    p_correlation_id, nullif(p_request_correlation_id, p_correlation_id), p_account_id, p_job_id,
    coalesce(p_details, '{}'::jsonb), coalesce(p_occurred_at, now()))
  on conflict (integration, operation, effect_key, attempt) where effect_key is not null do nothing;
  get diagnostics inserted = row_count;
  return inserted = 1;
end $$;

-- Configurable retention (RF-AUD-008, RNF-PER-005). Deletes at most p_batch rows older than
-- p_retention_days; the scheduler calls it only when a period is configured.
create function infra.purge_integration_logs(p_retention_days integer, p_batch integer default 5000)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  removed integer;
begin
  if p_retention_days not between 1 and 3650 then
    raise exception using errcode = '22023', message = 'Retention must be between 1 and 3650 days';
  end if;
  if p_batch not between 1 and 50000 then
    raise exception using errcode = '22023', message = 'Batch must be between 1 and 50000';
  end if;
  perform set_config('ice24.integration_log_purge', 'on', true);
  delete from infra.integration_logs l
  where l.id in (select o.id from infra.integration_logs o
    where o.occurred_at < now() - make_interval(days => p_retention_days)
    order by o.occurred_at limit p_batch);
  get diagnostics removed = row_count;
  perform set_config('ice24.integration_log_purge', 'off', true);
  return removed;
end $$;

alter table infra.integration_logs enable row level security;
revoke all on infra.integration_logs from public, anon, authenticated, service_role;
-- The runtime reads (diagnostic query); every write goes through the functions.
grant select on infra.integration_logs to service_role;
revoke all on function infra.guard_integration_log(),
  infra.record_integration_log(text, text, text, text, text, integer, text, text, boolean, integer,
    text, uuid, uuid, uuid, uuid, jsonb, timestamptz),
  infra.purge_integration_logs(integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function
  infra.record_integration_log(text, text, text, text, text, integer, text, text, boolean, integer,
    text, uuid, uuid, uuid, uuid, jsonb, timestamptz),
  infra.purge_integration_logs(integer, integer)
  to service_role;

-- RF-ADM-009: ICE24 consults integration logs. Global reads also require account-wide scope
-- and MFA in the API; without it the query is limited to the active account.
insert into authz.permissions (code, module_code, action_code, data_classification, description) values
  ('integration-logs.read', 'integration-logs', 'READ', 'RESTRICTED',
   'Read redacted integration logs by correlation, integration or account');
insert into authz.role_permissions (role_id, permission_id, effect)
select r.id, p.id, 'ALLOW' from authz.roles r cross join authz.permissions p
where p.code = 'integration-logs.read' and r.code = 'IA';
