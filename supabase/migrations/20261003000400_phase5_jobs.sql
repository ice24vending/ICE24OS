-- F5-07: asynchronous job registry, state history and audited DLQ retry (INT-004).
-- State changes happen only through the security definer functions below, so every
-- transition is recorded; the runtime role can read but not update jobs directly.
create table infra.async_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type varchar(100) not null check (job_type ~ '^[A-Z][A-Z0-9_]{1,99}$'),
  account_id uuid references identity.accounts(id),
  source_type varchar(60) not null check (length(trim(source_type)) > 0),
  source_id uuid not null,
  idempotency_key varchar(255) not null,
  queue_name text not null references infra.queue_policies(queue_name),
  message_id bigint,
  status varchar(30) not null default 'QUEUED'
    check (status in ('QUEUED','RUNNING','SUCCEEDED','RETRY_WAIT','FAILED','DEAD_LETTER')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null check (max_attempts between 1 and 20),
  manual_retry_count integer not null default 0 check (manual_retry_count >= 0),
  next_attempt_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  error_code varchar(80) check (error_code is null or error_code ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  error_detail_user text check (error_detail_user is null or length(error_detail_user) <= 500),
  error_detail_restricted jsonb check (error_detail_restricted is null or jsonb_typeof(error_detail_restricted) = 'object'),
  event_type varchar(120),
  correlation_id uuid,
  row_version integer not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_type, idempotency_key)
);
create index async_jobs_status_next on infra.async_jobs (status, next_attempt_at);
create index async_jobs_source on infra.async_jobs (source_type, source_id);
create index async_jobs_account_time on infra.async_jobs (account_id, created_at desc, id desc);
create index async_jobs_time on infra.async_jobs (created_at desc, id desc);
create index async_jobs_queue_status on infra.async_jobs (queue_name, status);

create table infra.async_job_transitions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references infra.async_jobs(id),
  from_status varchar(30),
  to_status varchar(30) not null,
  attempt integer not null check (attempt >= 0),
  error_code varchar(80),
  actor_type text not null check (actor_type in ('SYSTEM','USER')),
  actor_user_id uuid references identity.users(id),
  reason text check (reason is null or length(trim(reason)) between 10 and 1000),
  idempotency_key varchar(128),
  correlation_id uuid,
  occurred_at timestamptz not null default clock_timestamp(),
  check ((actor_type = 'USER' and actor_user_id is not null and reason is not null)
    or (actor_type = 'SYSTEM' and actor_user_id is null))
);
create index async_job_transitions_job on infra.async_job_transitions (job_id, occurred_at, id);
create unique index async_job_transitions_idempotency on infra.async_job_transitions (job_id, idempotency_key)
  where idempotency_key is not null;

create function infra.reject_job_history_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = '55000', message = 'Job history is append-only';
end $$;
create trigger async_job_transitions_immutable before update or delete on infra.async_job_transitions
for each statement execute function infra.reject_job_history_mutation();
create trigger async_job_transitions_no_truncate before truncate on infra.async_job_transitions
for each statement execute function infra.reject_job_history_mutation();

-- Identity and origin of a job never change; status follows the documented state machine.
create function infra.guard_job_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'Jobs are retained; archive instead of deleting';
  end if;
  if (new.id, new.job_type, new.source_type, new.source_id, new.idempotency_key, new.queue_name, new.created_at)
     is distinct from (old.id, old.job_type, old.source_type, old.source_id, old.idempotency_key, old.queue_name, old.created_at) then
    raise exception using errcode = '55000', message = 'Job identity is immutable';
  end if;
  if new.status is distinct from old.status and not (
       (new.status = 'RUNNING' and old.status in ('QUEUED','RUNNING','RETRY_WAIT','FAILED','DEAD_LETTER'))
    or (new.status in ('SUCCEEDED','RETRY_WAIT','FAILED') and old.status = 'RUNNING')
    or (new.status = 'DEAD_LETTER' and old.status in ('QUEUED','RUNNING','RETRY_WAIT'))
    or (new.status = 'QUEUED' and old.status in ('FAILED','DEAD_LETTER'))
  ) then
    raise exception using errcode = 'IC409', message = format('Invalid job transition %s -> %s', old.status, new.status);
  end if;
  new.row_version := old.row_version + 1;
  new.updated_at := now();
  return new;
end $$;
create trigger async_jobs_guard before update or delete on infra.async_jobs
for each row execute function infra.guard_job_update();
create trigger async_jobs_no_truncate before truncate on infra.async_jobs
for each statement execute function infra.reject_job_history_mutation();

create function infra.record_job_transition(
  p_job_id uuid, p_from text, p_to text, p_attempt integer, p_error_code text,
  p_actor_user_id uuid default null, p_reason text default null,
  p_idempotency_key text default null, p_correlation_id uuid default null
) returns void
language sql security definer set search_path = '' as $$
  insert into infra.async_job_transitions (job_id, from_status, to_status, attempt, error_code,
    actor_type, actor_user_id, reason, idempotency_key, correlation_id)
  values (p_job_id, p_from, p_to, p_attempt, p_error_code,
    case when p_actor_user_id is null then 'SYSTEM' else 'USER' end,
    p_actor_user_id, p_reason, p_idempotency_key, p_correlation_id)
$$;

-- A worker starts processing a delivery. Duplicates of an event share one job.
create function infra.job_start_delivery(
  p_queue text, p_message_id bigint, p_attempt integer, p_message jsonb
) returns table (job_id uuid, status text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  job infra.async_jobs%rowtype;
  event_id uuid := (p_message ->> 'eventId')::uuid;
  target_account uuid;
  policy_max integer;
begin
  select q.max_attempts into strict policy_max from infra.queue_policies q where q.queue_name = p_queue;
  select a.id into target_account from identity.accounts a where a.id = (p_message ->> 'accountId')::uuid;
  insert into infra.async_jobs (job_type, account_id, source_type, source_id, idempotency_key,
    queue_name, message_id, status, max_attempts, event_type, correlation_id)
  values ('DOMAIN_EVENT', target_account, 'DomainEvent', event_id, p_queue || ':' || event_id,
    p_queue, p_message_id, 'QUEUED', policy_max, left(p_message ->> 'type', 120),
    (p_message ->> 'correlationId')::uuid)
  on conflict (job_type, idempotency_key) do nothing
  returning * into job;
  if job.id is not null then
    perform infra.record_job_transition(job.id, null, 'QUEUED', 0, null);
  end if;
  select * into strict job from infra.async_jobs j
    where j.job_type = 'DOMAIN_EVENT' and j.idempotency_key = p_queue || ':' || event_id for update;
  if job.status = 'SUCCEEDED' then
    return query select job.id, job.status::text;
    return;
  end if;
  update infra.async_jobs j set status = 'RUNNING', attempt_count = p_attempt, message_id = p_message_id,
    started_at = now(), finished_at = null, next_attempt_at = null, error_code = null, error_detail_user = null
  where j.id = job.id;
  perform infra.record_job_transition(job.id, job.status, 'RUNNING', p_attempt, null);
  return query select job.id, 'RUNNING'::text;
end $$;

-- Records the result chosen by the worker (outcomes of infra.fail_job or success).
create function infra.job_finish(p_job_id uuid, p_outcome text, p_error_code text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  job infra.async_jobs%rowtype;
  target text;
begin
  select * into strict job from infra.async_jobs j where j.id = p_job_id for update;
  if job.status <> 'RUNNING' then
    return job.status; -- duplicate delivery of an already finished job
  end if;
  target := case p_outcome
    when 'succeeded' then 'SUCCEEDED'
    when 'retry_scheduled' then 'RETRY_WAIT'
    when 'dead_lettered' then 'DEAD_LETTER'
    when 'failed' then 'FAILED'
  end;
  if target is null then
    raise exception using errcode = '22023', message = 'Unknown job outcome';
  end if;
  update infra.async_jobs j set status = target,
    error_code = case when target = 'SUCCEEDED' then null else coalesce(p_error_code, 'HANDLER_FAILED') end,
    error_detail_user = case target
      when 'RETRY_WAIT' then 'El procesamiento falló temporalmente; se reintentará automáticamente.'
      when 'DEAD_LETTER' then 'El procesamiento agotó sus reintentos y requiere revisión de soporte.'
      when 'FAILED' then 'El procesamiento falló y requiere revisión de soporte.'
    end,
    -- Mirrors infra.fail_job backoff: 15 s x 2^(attempt-1), capped at 15 minutes.
    next_attempt_at = case when target = 'RETRY_WAIT'
      then now() + make_interval(secs => least(900, 15 * power(2, greatest(0, job.attempt_count - 1)))) end,
    finished_at = case when target in ('SUCCEEDED','FAILED','DEAD_LETTER') then now() end
  where j.id = job.id;
  perform infra.record_job_transition(job.id, 'RUNNING', target, job.attempt_count,
    case when target = 'SUCCEEDED' then null else coalesce(p_error_code, 'HANDLER_FAILED') end);
  return target;
end $$;

-- Invalid messages never reach consumers: register them directly as dead letters.
create function infra.job_record_poison(p_queue text, p_message_id bigint, p_error_code text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  job_id uuid;
  policy_max integer;
begin
  select q.max_attempts into strict policy_max from infra.queue_policies q where q.queue_name = p_queue;
  insert into infra.async_jobs (job_type, source_type, source_id, idempotency_key, queue_name,
    message_id, status, max_attempts, finished_at, error_code, error_detail_user)
  values ('DOMAIN_EVENT', 'QueueMessage', gen_random_uuid(), p_queue || ':msg:' || p_message_id,
    p_queue, p_message_id, 'DEAD_LETTER', policy_max, now(), p_error_code,
    'El mensaje no cumple el contrato y se envió a la cola de mensajes muertos.')
  on conflict (job_type, idempotency_key) do nothing
  returning id into job_id;
  if job_id is not null then
    perform infra.record_job_transition(job_id, null, 'DEAD_LETTER', 0, p_error_code);
  end if;
  return job_id;
end $$;

-- INT-004: support re-queues a dead-lettered job. One transaction moves the DLQ message
-- back to its queue, resets the job, records the transition and writes central audit.
-- Repeating the same idempotency key returns the job without sending again.
create function infra.retry_dead_letter_job(
  p_job_id uuid, p_actor_user_id uuid, p_context_session_id uuid, p_reason text,
  p_idempotency_key text, p_correlation_id uuid
) returns setof infra.async_jobs
language plpgsql security definer set search_path = '' as $$
declare
  job infra.async_jobs%rowtype;
  dlq text;
  dead_message_id bigint;
  dead_message jsonb;
  new_message_id bigint;
  zone text;
  session_id uuid;
begin
  if p_reason is null or length(trim(p_reason)) < 10 or length(p_reason) > 1000 then
    raise exception using errcode = '22023', message = 'A reason of 10 to 1000 characters is required';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128 then
    raise exception using errcode = '22023', message = 'Invalid idempotency key';
  end if;
  select * into job from infra.async_jobs j where j.id = p_job_id for update;
  if job.id is null then
    raise exception using errcode = 'IC404', message = 'Job not found';
  end if;
  if exists (select 1 from infra.async_job_transitions t
             where t.job_id = job.id and t.idempotency_key = p_idempotency_key) then
    return query select * from infra.async_jobs j where j.id = job.id;
    return;
  end if;
  if job.status not in ('DEAD_LETTER','FAILED') then
    raise exception using errcode = 'IC409', message = 'Only dead-lettered or failed jobs can be retried';
  end if;
  select q.dead_letter_queue into strict dlq from infra.queue_policies q where q.queue_name = job.queue_name;
  execute format(
    'select msg_id, message from pgmq.%I where message ->> ''sourceQueue'' = $1
       and (message ->> ''sourceMessageId'')::bigint = $2 order by msg_id limit 1 for update',
    'q_' || dlq) into dead_message_id, dead_message using job.queue_name, job.message_id;
  if dead_message_id is null then
    raise exception using errcode = 'IC409', message = 'Dead-letter message not found';
  end if;
  select pgmq.send(job.queue_name, dead_message -> 'payload') into new_message_id;
  perform pgmq.archive(dlq, dead_message_id);
  update infra.async_jobs j set status = 'QUEUED', attempt_count = 0, message_id = new_message_id,
    manual_retry_count = job.manual_retry_count + 1, next_attempt_at = now(), started_at = null,
    finished_at = null, error_code = null, error_detail_user = null
  where j.id = job.id;
  perform infra.record_job_transition(job.id, job.status, 'QUEUED', job.attempt_count, job.error_code,
    p_actor_user_id, p_reason, p_idempotency_key, p_correlation_id);
  select u.time_zone into zone from identity.users u where u.id = p_actor_user_id;
  -- Keep the context only when it belongs to the actor (same rule as the F5-04 projection).
  if p_context_session_id is not null and not exists (select 1 from identity.context_sessions c
      where c.id = p_context_session_id and c.user_id = p_actor_user_id) then
    session_id := null;
  else
    session_id := p_context_session_id;
  end if;
  insert into audit.events (event_version, occurred_at_utc, time_zone, actor_user_id, actor_type,
    context_session_id, account_id, entity_type, entity_id, operation, previous_values, new_values,
    reason, origin, result, correlation_id)
  values (1, now(), coalesce(zone, 'UTC'), p_actor_user_id, 'USER', session_id,
    job.account_id, 'AsyncJob', job.id, 'JobRetryRequested',
    jsonb_build_object('status', job.status, 'attemptCount', job.attempt_count,
      'errorCode', job.error_code, 'queue', job.queue_name),
    jsonb_build_object('status', 'QUEUED', 'manualRetryCount', job.manual_retry_count + 1),
    p_reason, 'ADMIN', 'SUCCESS', coalesce(p_correlation_id, gen_random_uuid()));
  return query select * from infra.async_jobs j where j.id = job.id;
end $$;

-- Queue depth for the job center, readable without granting PGMQ access.
create function infra.queue_overview()
returns table (queue_name text, dead_letter_queue text, max_attempts integer,
  depth bigint, oldest_seconds bigint, dead_letters bigint, oldest_dead_letter_seconds bigint)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  policy infra.queue_policies%rowtype;
  d bigint; o bigint; dd bigint; od bigint;
begin
  for policy in select * from infra.queue_policies q order by q.queue_name loop
    execute format('select count(*), extract(epoch from now() - min(enqueued_at))::bigint from pgmq.%I',
      'q_' || policy.queue_name) into d, o;
    execute format('select count(*), extract(epoch from now() - min(enqueued_at))::bigint from pgmq.%I',
      'q_' || policy.dead_letter_queue) into dd, od;
    return query select policy.queue_name, policy.dead_letter_queue, policy.max_attempts, d, o, dd, od;
  end loop;
end $$;

alter table infra.async_jobs enable row level security;
alter table infra.async_job_transitions enable row level security;
revoke all on infra.async_jobs, infra.async_job_transitions from public, anon, authenticated, service_role;
grant select on infra.async_jobs, infra.async_job_transitions to service_role;
revoke all on function infra.reject_job_history_mutation(), infra.guard_job_update(),
  infra.record_job_transition(uuid, text, text, integer, text, uuid, text, text, uuid),
  infra.job_start_delivery(text, bigint, integer, jsonb), infra.job_finish(uuid, text, text),
  infra.job_record_poison(text, bigint, text),
  infra.retry_dead_letter_job(uuid, uuid, uuid, text, text, uuid), infra.queue_overview()
  from public, anon, authenticated, service_role;
grant execute on function infra.job_start_delivery(text, bigint, integer, jsonb),
  infra.job_finish(uuid, text, text), infra.job_record_poison(text, bigint, text),
  infra.retry_dead_letter_job(uuid, uuid, uuid, text, text, uuid), infra.queue_overview()
  to service_role;

insert into authz.permissions (code, module_code, action_code, data_classification, description) values
  ('jobs.read', 'jobs', 'READ', 'CONFIDENTIAL', 'Read asynchronous jobs of the active account'),
  ('jobs.admin-read', 'jobs', 'READ', 'RESTRICTED', 'Read the global ICE24 job center and queues'),
  ('jobs.retry', 'jobs', 'RETRY', 'RESTRICTED', 'Re-queue dead-lettered jobs with audited reason');
insert into authz.role_permissions (role_id, permission_id, effect)
select r.id, p.id, 'ALLOW' from authz.roles r cross join authz.permissions p
where (p.code = 'jobs.read' and r.code in ('IA', 'OW'))
   or (p.code in ('jobs.admin-read', 'jobs.retry') and r.code = 'IA');
