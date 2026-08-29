-- Phase 2 platform primitives only. No business or regulatory seed data belongs here.
create schema if not exists infra;

create extension if not exists pgmq;
create extension if not exists pg_cron;

do $$
declare
  target_queue_name text;
begin
  foreach target_queue_name in array array['general_jobs', 'general_jobs_dlq', 'pdf_jobs', 'pdf_jobs_dlq']
  loop
    if not exists (
      select 1 from pgmq.list_queues() existing_queue
      where existing_queue.queue_name = target_queue_name
    ) then
      perform pgmq.create(target_queue_name);
    end if;
  end loop;
end
$$;

create table if not exists infra.queue_policies (
  queue_name text primary key,
  dead_letter_queue text not null unique,
  visibility_timeout_seconds integer not null check (visibility_timeout_seconds between 1 and 3600),
  max_attempts integer not null check (max_attempts between 1 and 20),
  created_at timestamptz not null default now(),
  constraint queue_policy_names check (queue_name ~ '^[a-z0-9_]+$' and dead_letter_queue ~ '^[a-z0-9_]+$')
);

insert into infra.queue_policies (
  queue_name,
  dead_letter_queue,
  visibility_timeout_seconds,
  max_attempts
)
values
  ('general_jobs', 'general_jobs_dlq', 60, 5),
  ('pdf_jobs', 'pdf_jobs_dlq', 180, 3)
on conflict (queue_name) do update
set dead_letter_queue = excluded.dead_letter_queue,
    visibility_timeout_seconds = excluded.visibility_timeout_seconds,
    max_attempts = excluded.max_attempts;

create table if not exists infra.job_dispatches (
  id uuid primary key,
  queue_name text not null references infra.queue_policies(queue_name),
  idempotency_key text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  message_id bigint,
  dispatched_at timestamptz,
  created_at timestamptz not null default now(),
  unique (queue_name, idempotency_key)
);

create index if not exists job_dispatches_pending_idx
  on infra.job_dispatches (created_at)
  where dispatched_at is null;

create or replace function infra.dispatch_pending_jobs(batch_size integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending infra.job_dispatches%rowtype;
  dispatched_count integer := 0;
  queued_message_id bigint;
begin
  if batch_size < 1 or batch_size > 500 then
    raise exception 'batch_size must be between 1 and 500';
  end if;

  for pending in
    select *
    from infra.job_dispatches
    where dispatched_at is null
    order by created_at
    for update skip locked
    limit batch_size
  loop
    select pgmq.send(pending.queue_name, pending.payload) into queued_message_id;
    update infra.job_dispatches
    set message_id = queued_message_id,
        dispatched_at = now()
    where id = pending.id;
    dispatched_count := dispatched_count + 1;
  end loop;

  return dispatched_count;
end
$$;

create or replace function infra.enqueue_job(
  p_target_queue text,
  p_job_id uuid,
  p_idempotency_key text,
  p_payload jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_message_id bigint;
begin
  if length(p_idempotency_key) < 8 or length(p_idempotency_key) > 200 then
    raise exception 'invalid idempotency key';
  end if;

  insert into infra.job_dispatches (id, queue_name, idempotency_key, payload)
  values (p_job_id, p_target_queue, p_idempotency_key, p_payload)
  on conflict (queue_name, idempotency_key) do nothing;

  perform infra.dispatch_pending_jobs(100);

  select message_id into result_message_id
  from infra.job_dispatches
  where queue_name = p_target_queue
    and idempotency_key = p_idempotency_key;

  return result_message_id;
end
$$;

create or replace function infra.fail_job(
  p_source_queue text,
  p_source_message_id bigint,
  p_payload jsonb,
  p_attempt integer,
  p_failure_code text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy infra.queue_policies%rowtype;
  retry_delay integer;
begin
  select * into strict policy
  from infra.queue_policies
  where queue_name = p_source_queue;

  if p_attempt >= policy.max_attempts then
    perform pgmq.send(
      policy.dead_letter_queue,
      jsonb_build_object(
        'sourceQueue', p_source_queue,
        'sourceMessageId', p_source_message_id,
        'attempt', p_attempt,
        'failureCode', left(p_failure_code, 80),
        'payload', p_payload
      )
    );
    perform pgmq.archive(p_source_queue, p_source_message_id);
    return 'dead_lettered';
  end if;

  retry_delay := least(900, 15 * power(2, greatest(0, p_attempt - 1))::integer);
  perform pgmq.set_vt(p_source_queue, p_source_message_id, retry_delay);
  return 'retry_scheduled';
end
$$;

create table if not exists infra.scheduler_heartbeats (
  scheduler_name text primary key,
  last_seen_at timestamptz not null
);

create or replace function infra.record_scheduler_heartbeat()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into infra.scheduler_heartbeats (scheduler_name, last_seen_at)
  values ('ice24_queue_scheduler', now())
  on conflict (scheduler_name) do update set last_seen_at = excluded.last_seen_at;
$$;

select cron.unschedule(jobid)
from cron.job
where jobname in ('ice24_dispatch_jobs', 'ice24_queue_heartbeat');

select cron.schedule(
  'ice24_dispatch_jobs',
  '* * * * *',
  'select infra.dispatch_pending_jobs(100)'
);

select cron.schedule(
  'ice24_queue_heartbeat',
  '*/5 * * * *',
  'select infra.record_scheduler_heartbeat()'
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('quarantine', 'quarantine', false, 52428800, array['application/pdf', 'image/jpeg', 'image/png']),
  ('originals', 'originals', false, 52428800, array['application/pdf', 'image/jpeg', 'image/png']),
  ('derivatives', 'derivatives', false, 52428800, array['application/pdf', 'image/jpeg', 'image/png']),
  ('exports', 'exports', false, 104857600, array['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists infra.object_retention_policies (
  bucket_id text primary key references storage.buckets(id),
  retention_class text not null check (retention_class in ('quarantine', 'record', 'derived', 'temporary')),
  minimum_days integer check (minimum_days is null or minimum_days >= 1),
  requires_legal_review boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into infra.object_retention_policies (
  bucket_id,
  retention_class,
  minimum_days,
  requires_legal_review
)
values
  ('quarantine', 'quarantine', 7, false),
  ('originals', 'record', null, true),
  ('derivatives', 'derived', null, true),
  ('exports', 'temporary', 7, false)
on conflict (bucket_id) do update
set retention_class = excluded.retention_class,
    minimum_days = excluded.minimum_days,
    requires_legal_review = excluded.requires_legal_review,
    updated_at = now();

create table if not exists infra.object_backup_manifest (
  backup_id uuid not null,
  bucket_id text not null references storage.buckets(id),
  object_name text not null,
  object_version text,
  checksum_sha256 text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes bigint not null check (size_bytes >= 0),
  captured_at timestamptz not null default now(),
  primary key (backup_id, bucket_id, object_name)
);

alter table infra.queue_policies enable row level security;
alter table infra.job_dispatches enable row level security;
alter table infra.scheduler_heartbeats enable row level security;
alter table infra.object_retention_policies enable row level security;
alter table infra.object_backup_manifest enable row level security;

revoke all on schema infra from public, anon, authenticated;
revoke all on all tables in schema infra from public, anon, authenticated;
revoke all on all functions in schema infra from public, anon, authenticated;
grant usage on schema infra to service_role;
grant select, insert, update on all tables in schema infra to service_role;
grant execute on all functions in schema infra to service_role;
