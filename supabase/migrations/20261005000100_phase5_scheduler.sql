-- F5-13: scheduler for expirations, periodic report periods and Stripe reconciliation
-- (TRD Scheduler; Architecture "Scheduler administrado": observable, idempotent execution).
-- Flow: the worker registry computes the due windows of every task in its explicit time zone and
-- calls `infra.scheduler_enqueue`. The unique (task, window) row is the idempotency key: of two
-- workers ticking at once only one creates the window, its SCHEDULED_TASK job (F5-07 registry)
-- and the `scheduled_tasks` queue message. A consumer takes a lease on the window before running
-- the handler; a crashed worker loses the lease when it expires and the queue redelivers the
-- message, so another worker resumes the window. Handlers make every effect idempotent by item.
-- Failures retry with the queue policy backoff; exhausted windows go to `scheduled_tasks_dlq`
-- and support re-queues them from the Job Center (INT-004).
-- Additive migration: new tables, queue and functions. Two existing objects are widened without
-- removing behaviour: the subscription event actor check admits SYSTEM, and the central audit
-- projection records SYSTEM subscription events with origin WORKER.

-- Operational pause per task. Absent row = active. Changes keep an append-only history.
create table infra.scheduler_task_controls (
  task_name varchar(80) primary key
    check (task_name ~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$'),
  paused boolean not null default false,
  reason text check (reason is null or length(trim(reason)) between 10 and 500),
  updated_at timestamptz not null default now(),
  check (not paused or reason is not null)
);

create table infra.scheduler_control_changes (
  id uuid primary key default gen_random_uuid(),
  task_name varchar(80) not null,
  paused boolean not null,
  reason text not null check (length(trim(reason)) between 10 and 500),
  -- Ticket or operational role, never a personal name or address.
  requested_by varchar(120) not null check (requested_by ~ '^[A-Za-z0-9._:#/-]{3,120}$'),
  occurred_at timestamptz not null default clock_timestamp()
);

create table infra.scheduler_windows (
  id uuid primary key default gen_random_uuid(),
  task_name varchar(80) not null check (task_name ~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$'),
  window_key varchar(64) not null check (length(window_key) between 10 and 64),
  window_start timestamptz not null,
  window_end timestamptz not null,
  time_zone varchar(64) not null check (length(trim(time_zone)) > 0),
  status varchar(20) not null default 'QUEUED'
    check (status in ('QUEUED','RUNNING','RETRY_WAIT','FAILED','SUCCEEDED')),
  job_id uuid references infra.async_jobs(id),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  -- Times a worker took over a window whose lease had expired (crash or stall).
  recovered_count integer not null default 0 check (recovered_count >= 0),
  lease_owner uuid,
  lease_expires_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  error_code varchar(80) check (error_code is null or error_code ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  -- Counters returned by the handler only; never payloads or personal data.
  result jsonb check (result is null or jsonb_typeof(result) = 'object'),
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_name, window_key),
  check (window_end > window_start),
  check ((lease_owner is null) = (lease_expires_at is null))
);
create index scheduler_windows_task_end on infra.scheduler_windows (task_name, window_end desc);
create index scheduler_windows_status on infra.scheduler_windows (status, updated_at);

create function infra.guard_scheduler_window() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'UPDATE' then
    raise exception using errcode = '55000', message = 'Scheduler windows are retained';
  end if;
  if (new.id, new.task_name, new.window_key, new.window_start, new.window_end, new.time_zone,
      new.correlation_id, new.created_at)
     is distinct from (old.id, old.task_name, old.window_key, old.window_start, old.window_end,
      old.time_zone, old.correlation_id, old.created_at) then
    raise exception using errcode = '55000', message = 'Scheduler window identity is immutable';
  end if;
  if old.status = 'SUCCEEDED' and new.status <> 'SUCCEEDED' then
    raise exception using errcode = 'IC409', message = 'A completed window never runs again';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger scheduler_windows_guard before update or delete on infra.scheduler_windows
for each row execute function infra.guard_scheduler_window();
create trigger scheduler_windows_no_truncate before truncate on infra.scheduler_windows
for each statement execute function infra.reject_job_history_mutation();
create trigger scheduler_control_changes_immutable before update or delete on infra.scheduler_control_changes
for each statement execute function infra.reject_job_history_mutation();
create trigger scheduler_control_changes_no_truncate before truncate on infra.scheduler_control_changes
for each statement execute function infra.reject_job_history_mutation();

-- Window queue; same retry/DLQ model as domain events, file scans and email.
do $$
declare
  target_queue_name text;
begin
  foreach target_queue_name in array array['scheduled_tasks', 'scheduled_tasks_dlq']
  loop
    if not exists (select 1 from pgmq.list_queues() existing_queue
                   where existing_queue.queue_name = target_queue_name) then
      perform pgmq.create(target_queue_name);
    end if;
  end loop;
end
$$;
-- The visibility timeout is the lease: a message read by a crashed worker reappears after it.
insert into infra.queue_policies (queue_name, dead_letter_queue, visibility_timeout_seconds, max_attempts)
values ('scheduled_tasks', 'scheduled_tasks_dlq', 300, 5)
on conflict (queue_name) do nothing;

-- Liveness of the task scheduler, next to the F2-05 queue heartbeat.
create function infra.record_task_scheduler_heartbeat() returns void
language sql security definer set search_path = '' as $$
  insert into infra.scheduler_heartbeats (scheduler_name, last_seen_at)
  values ('ice24_task_scheduler', now())
  on conflict (scheduler_name) do update set last_seen_at = excluded.last_seen_at;
$$;

-- Creates one window with its job and queue message. Returns ENQUEUED, EXISTS (another worker
-- or an earlier tick already created it), PAUSED (nothing is created) or EARLY (the window has
-- not closed by the database clock, e.g. worker clock skew: nothing is created, next tick retries).
create function infra.scheduler_enqueue(
  p_task text, p_window_key text, p_window_start timestamptz, p_window_end timestamptz,
  p_time_zone text
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  window_row infra.scheduler_windows%rowtype;
  new_job uuid;
  sent bigint;
  policy_max integer;
begin
  if exists (select 1 from infra.scheduler_task_controls c where c.task_name = p_task and c.paused) then
    return 'PAUSED';
  end if;
  if p_window_end <= p_window_start then
    raise exception using errcode = '22023', message = 'A window must end after it starts';
  end if;
  if p_window_end > now() then
    return 'EARLY';
  end if;
  insert into infra.scheduler_windows (task_name, window_key, window_start, window_end, time_zone)
  values (p_task, p_window_key, p_window_start, p_window_end, p_time_zone)
  on conflict (task_name, window_key) do nothing
  returning * into window_row;
  if window_row.id is null then
    return 'EXISTS';
  end if;
  select q.max_attempts into strict policy_max from infra.queue_policies q where q.queue_name = 'scheduled_tasks';
  insert into infra.async_jobs (job_type, source_type, source_id, idempotency_key, queue_name,
    status, max_attempts, event_type, correlation_id)
  values ('SCHEDULED_TASK', 'ScheduledWindow', window_row.id,
    'scheduler:' || p_task || ':' || p_window_key, 'scheduled_tasks', 'QUEUED', policy_max,
    left(p_task, 120), window_row.correlation_id)
  returning id into new_job;
  perform infra.record_job_transition(new_job, null, 'QUEUED', 0, null, null, null, null,
    window_row.correlation_id);
  select pgmq.send('scheduled_tasks', jsonb_build_object('messageVersion', 1, 'jobId', new_job,
    'windowId', window_row.id, 'task', p_task,
    'windowStart', to_char(p_window_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'windowEnd', to_char(p_window_end at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'timeZone', p_time_zone, 'correlationId', window_row.correlation_id)) into sent;
  update infra.async_jobs j set message_id = sent where j.id = new_job;
  update infra.scheduler_windows w set job_id = new_job where w.id = window_row.id;
  return 'ENQUEUED';
end $$;

-- Takes the lease of a window and starts its job. Actions:
-- RUN (lease taken; the handler may run), DONE (window already completed: acknowledge),
-- BUSY (another worker holds a valid lease: leave the message) or MISSING (no such job/window).
create function infra.scheduler_run_start(
  p_job_id uuid, p_window_id uuid, p_queue text, p_queue_message_id bigint, p_attempt integer,
  p_owner uuid, p_lease_seconds integer
) returns table (action text, recovered boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  job infra.async_jobs%rowtype;
  window_row infra.scheduler_windows%rowtype;
  takeover boolean := false;
begin
  if p_lease_seconds not between 30 and 3600 then
    raise exception using errcode = '22023', message = 'Lease must be between 30 and 3600 seconds';
  end if;
  select * into window_row from infra.scheduler_windows w where w.id = p_window_id for update;
  select * into job from infra.async_jobs j
    where j.id = p_job_id and j.job_type = 'SCHEDULED_TASK' and j.source_type = 'ScheduledWindow'
      and j.source_id = p_window_id and j.queue_name = p_queue
    for update;
  if window_row.id is null or job.id is null or window_row.job_id is distinct from job.id then
    return query select 'MISSING'::text, false;
    return;
  end if;
  if window_row.status = 'SUCCEEDED' then
    return query select 'DONE'::text, false;
    return;
  end if;
  if window_row.lease_owner is not null and window_row.lease_owner <> p_owner
     and window_row.lease_expires_at > now() then
    return query select 'BUSY'::text, false;
    return;
  end if;
  takeover := window_row.status = 'RUNNING' and window_row.lease_owner is not null
    and window_row.lease_owner <> p_owner;
  update infra.scheduler_windows w set status = 'RUNNING', lease_owner = p_owner,
    lease_expires_at = now() + make_interval(secs => p_lease_seconds),
    attempt_count = greatest(w.attempt_count, p_attempt), started_at = now(), finished_at = null,
    error_code = null, recovered_count = w.recovered_count + case when takeover then 1 else 0 end
  where w.id = window_row.id;
  update infra.async_jobs j set status = 'RUNNING', attempt_count = p_attempt,
    message_id = p_queue_message_id, started_at = now(), finished_at = null, next_attempt_at = null,
    error_code = null, error_detail_user = null
  where j.id = job.id;
  perform infra.record_job_transition(job.id, job.status, 'RUNNING', p_attempt,
    case when takeover then 'LEASE_EXPIRED' end, null, null, null, window_row.correlation_id);
  return query select 'RUN'::text, takeover;
end $$;

-- Extends the lease (and the message visibility) while a long handler progresses. False when the
-- lease was lost: the handler must stop without recording a result.
create function infra.scheduler_renew_lease(
  p_window_id uuid, p_owner uuid, p_lease_seconds integer, p_queue text, p_queue_message_id bigint
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  renewed integer;
begin
  if p_lease_seconds not between 30 and 3600 then
    raise exception using errcode = '22023', message = 'Lease must be between 30 and 3600 seconds';
  end if;
  update infra.scheduler_windows w
    set lease_expires_at = now() + make_interval(secs => p_lease_seconds)
  where w.id = p_window_id and w.status = 'RUNNING' and w.lease_owner = p_owner;
  get diagnostics renewed = row_count;
  if renewed = 0 then
    return false;
  end if;
  if p_queue = 'scheduled_tasks' then
    perform pgmq.set_vt(p_queue, p_queue_message_id, p_lease_seconds);
  end if;
  return true;
end $$;

-- Records success. LEASE_LOST when another worker took the window over meanwhile.
create function infra.scheduler_run_finish(
  p_window_id uuid, p_job_id uuid, p_owner uuid, p_result jsonb
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  window_row infra.scheduler_windows%rowtype;
begin
  select * into strict window_row from infra.scheduler_windows w where w.id = p_window_id for update;
  if window_row.status = 'SUCCEEDED' then
    return 'SUCCEEDED';
  end if;
  if window_row.status <> 'RUNNING' or window_row.lease_owner is distinct from p_owner then
    return 'LEASE_LOST';
  end if;
  update infra.scheduler_windows w set status = 'SUCCEEDED', lease_owner = null,
    lease_expires_at = null, finished_at = now(), error_code = null,
    result = coalesce(p_result, '{}'::jsonb)
  where w.id = window_row.id;
  perform infra.job_finish(p_job_id, 'succeeded', null);
  return 'SUCCEEDED';
end $$;

-- Records the outcome chosen by infra.fail_job (retry_scheduled or dead_lettered).
create function infra.scheduler_run_fail(
  p_window_id uuid, p_job_id uuid, p_owner uuid, p_outcome text, p_error_code text
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  window_row infra.scheduler_windows%rowtype;
begin
  if p_outcome not in ('retry_scheduled','dead_lettered') then
    raise exception using errcode = '22023', message = 'Unknown scheduler outcome';
  end if;
  select * into strict window_row from infra.scheduler_windows w where w.id = p_window_id for update;
  if window_row.status <> 'RUNNING' or window_row.lease_owner is distinct from p_owner then
    return 'LEASE_LOST';
  end if;
  update infra.scheduler_windows w
    set status = case when p_outcome = 'dead_lettered' then 'FAILED' else 'RETRY_WAIT' end,
      lease_owner = null, lease_expires_at = null,
      finished_at = case when p_outcome = 'dead_lettered' then now() end,
      error_code = coalesce(p_error_code, 'HANDLER_FAILED')
  where w.id = window_row.id;
  return infra.job_finish(p_job_id, p_outcome, coalesce(p_error_code, 'HANDLER_FAILED'));
end $$;

-- Operational pause and resume (runbook). Windows already queued still run; while paused no
-- new window is created, and on resume the task catch-up limit decides which missed ones run.
create function infra.scheduler_set_paused(
  p_task text, p_paused boolean, p_reason text, p_requested_by text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_reason is null or length(trim(p_reason)) not between 10 and 500 then
    raise exception using errcode = '22023', message = 'A reason of 10 to 500 characters is required';
  end if;
  insert into infra.scheduler_task_controls (task_name, paused, reason, updated_at)
  values (p_task, p_paused, p_reason, now())
  on conflict (task_name) do update set paused = excluded.paused, reason = excluded.reason,
    updated_at = excluded.updated_at;
  insert into infra.scheduler_control_changes (task_name, paused, reason, requested_by)
  values (p_task, p_paused, p_reason, p_requested_by);
end $$;

-- Report periods (RF-RPT-003). The event id is the window id, so a retried or duplicated run
-- publishes it once. It closes a period only: which reports run and who receives them belong to
-- report schedules (TASK-F10-09), which send through `email.request` (F5-12).
create function infra.scheduler_emit_report_period(p_window_id uuid, p_frequency text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  window_row infra.scheduler_windows%rowtype;
  inserted integer;
begin
  if p_frequency not in ('WEEKLY','MONTHLY','QUARTERLY','YEARLY') then
    raise exception using errcode = '22023', message = 'Unknown report frequency';
  end if;
  select * into strict window_row from infra.scheduler_windows w where w.id = p_window_id;
  insert into infra.outbox_events (id, event_type, aggregate_type, aggregate_id, aggregate_version,
    account_id, actor_type, payload, sensitivity, correlation_id, occurred_at)
  values (window_row.id, 'ReportPeriodClosed', 'ReportPeriod', window_row.id, 0, null, 'SYSTEM',
    jsonb_build_object('frequency', p_frequency,
      'periodStart', to_char(window_row.window_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'periodEnd', to_char(window_row.window_end at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'timeZone', window_row.time_zone, 'task', window_row.task_name),
    'internal', window_row.correlation_id, window_row.window_end)
  on conflict (id) do nothing;
  get diagnostics inserted = row_count;
  return inserted = 1;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Subscriptions: expirations materialized by the scheduler.
-- `subscriptions.effective_access` already restricts access by clock (F5-01/F5-03); these
-- transitions record the state, history and audit that the API rules (`expire` command) define.

alter table subscriptions.events drop constraint subscription_event_actor;
alter table subscriptions.events add constraint subscription_event_actor check (
  (actor_type='USER' and actor_id is not null and context_id is not null and provider_event_id is null)
  or (actor_type='STRIPE' and actor_id is null and context_id is null and provider_event_id is not null)
  or (actor_type='SYSTEM' and actor_id is null and context_id is null and provider_event_id is null)
);

-- Same projection as F5-04, with origin WORKER for SYSTEM subscription events.
create or replace function audit.capture_domain_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  actor uuid; context_id uuid; target_account uuid; target_entity uuid;
  entity text; event_origin text := 'API'; actor_kind text := 'USER';
  previous_summary jsonb; next_summary jsonb; outcome text := 'SUCCESS';
  captured_branch uuid; captured_machine uuid; zone text;
begin
  if tg_table_schema='subscriptions' then
    actor := new.actor_id; context_id := new.context_id; target_account := new.account_id;
    target_entity := new.subscription_id; entity := 'Subscription';
    actor_kind := new.actor_type;
    if actor_kind='STRIPE' then event_origin := 'WEBHOOK'; end if;
    if actor_kind='SYSTEM' then event_origin := 'WORKER'; end if;
    previous_summary := audit.event_summary(new.previous_state);
    next_summary := audit.event_summary(new.new_state);
  elsif tg_table_schema='equipment' then
    actor := new.actor_id; context_id := new.context_id; target_account := new.account_id;
    target_entity := new.resource_id; entity := 'EquipmentResource';
    if new.event_type like 'MEMBER%' then entity := 'Membership'; end if;
    select m.id,m.branch_id into captured_machine,captured_branch from equipment.machines m
      where m.id=target_entity and m.account_id=target_account;
    if captured_machine is null then
      select b.id into captured_branch from equipment.branches b
        where b.id=target_entity and b.account_id=target_account;
    end if;
    previous_summary := audit.event_summary(new.before_data);
    next_summary := audit.event_summary(new.after_data);
  else
    actor := new.actor_user_id; context_id := new.context_session_id;
    target_account := new.account_id; target_entity := coalesce(new.subject_user_id,new.id);
    entity := 'Identity'; outcome := new.result;
    next_summary := audit.event_summary(new.metadata);
    if new.event_type='MEMBERSHIP_CHANGED' then
      next_summary := coalesce(next_summary,'{}'::jsonb) || coalesce((
        select jsonb_build_object('status',m.status,'roleCodes',coalesce((
          select jsonb_agg(r.code order by r.code) from authz.membership_roles mr
          join authz.roles r on r.id=mr.role_id where mr.membership_id=m.id and mr.valid_to is null
        ),'[]'::jsonb)) from identity.account_memberships m
        where m.id::text=new.metadata->>'membershipId'
      ),'{}'::jsonb);
    end if;
    if actor is null then actor_kind := 'SYSTEM'; context_id := null; end if;
    -- Legacy revocation events can reference the subject's session, not the actor's.
    if context_id is not null and not exists(select 1 from identity.context_sessions c
      where c.id=context_id and c.user_id=actor) then
      next_summary := coalesce(next_summary,'{}'::jsonb) || jsonb_build_object('subjectContextId',context_id);
      context_id := null;
    end if;
  end if;
  select u.time_zone into zone from identity.users u where u.id=actor;
  insert into audit.events(id,event_version,occurred_at_utc,time_zone,actor_user_id,actor_type,
    context_session_id,account_id,branch_id,machine_id,entity_type,entity_id,operation,
    previous_values,new_values,reason,origin,result,correlation_id)
  values(new.id,1,new.occurred_at,coalesce(zone,'UTC'),actor,actor_kind,context_id,
    target_account,captured_branch,captured_machine,entity,target_entity,new.event_type,
    previous_summary,next_summary,new.reason,event_origin,outcome,new.correlation_id);
  return new;
end $$;

-- Subscription contract shape (@ice24/contracts subscriptionSchema) of a record.
create function subscriptions.state_json(r subscriptions.records) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id', r.id, 'accountId', r.account_id, 'provider', r.provider,
    'providerCustomerId', r.provider_customer_id, 'providerSubscriptionId', r.provider_subscription_id,
    'planCode', r.plan_code,
    'price', jsonb_build_object('amountMinor', r.amount_minor, 'currency', r.currency_code),
    'status', r.status,
    'currentPeriodStart', to_char(r.current_period_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'currentPeriodEnd', to_char(r.current_period_end at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'cancelAtPeriodEnd', r.cancel_at_period_end, 'isDemo', r.is_demo,
    'demoExpiresAt', to_char(r.demo_expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'version', r.row_version,
    'createdAt', to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedAt', to_char(r.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
$$;

-- Materializes up to p_limit due expirations, each validated against its current state under a
-- row lock (`expire` rules of the API domain):
-- * demo whose validity ended  -> read_only  (event DEMO_EXPIRED);
-- * cancellation_scheduled whose paid period ended -> cancelled (event SUBSCRIPTION_CANCELLED).
-- Anything else is left untouched: a retried or concurrent run finds nothing left to do, so no
-- effect repeats. No grace period, deletion or retention rule is applied (DEC-017, DEC-008).
create function subscriptions.expire_due(p_limit integer, p_correlation_id uuid)
returns table (demos integer, cancellations integer)
language plpgsql security definer set search_path = '' as $$
declare
  due subscriptions.records%rowtype;
  next_row subscriptions.records%rowtype;
  demo_count integer := 0;
  cancel_count integer := 0;
begin
  if p_limit not between 1 and 500 then
    raise exception using errcode = '22023', message = 'Limit must be between 1 and 500';
  end if;
  for due in
    select * from subscriptions.records r
    where (r.is_demo and r.status = 'demo' and r.demo_expires_at <= now())
       or (not r.is_demo and r.status = 'cancellation_scheduled' and r.current_period_end <= now())
    order by coalesce(r.demo_expires_at, r.current_period_end), r.id
    limit p_limit
    for update skip locked
  loop
    if due.is_demo then
      update subscriptions.records r set status = 'read_only', row_version = r.row_version + 1,
        updated_at = now(), updated_by = null
      where r.id = due.id returning * into next_row;
      demo_count := demo_count + 1;
    else
      update subscriptions.records r set status = 'cancelled', cancel_at_period_end = false,
        row_version = r.row_version + 1, updated_at = now(), updated_by = null
      where r.id = due.id returning * into next_row;
      cancel_count := cancel_count + 1;
    end if;
    perform identity.apply_subscription_access(due.account_id, 'READ_ONLY');
    insert into subscriptions.events (subscription_id, account_id, actor_id, context_id,
      correlation_id, event_type, reason, previous_state, new_state, actor_type)
    values (due.id, due.account_id, null, null, coalesce(p_correlation_id, gen_random_uuid()),
      case when due.is_demo then 'DEMO_EXPIRED' else 'SUBSCRIPTION_CANCELLED' end,
      case when due.is_demo
        then 'Demo validity ended; the scheduler recorded read-only access'
        else 'Paid period of the scheduled cancellation ended; the scheduler recorded the cancellation' end,
      subscriptions.state_json(due), subscriptions.state_json(next_row), 'SYSTEM');
  end loop;
  return query select demo_count, cancel_count;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Stripe reconciliation: local state against provider observations. Findings are evidence for
-- support; nothing here changes a subscription (verified webhooks keep doing that, ADR-024).

create table subscriptions.reconciliation_checks (
  subscription_id uuid primary key references subscriptions.records(id),
  last_window_id uuid not null references infra.scheduler_windows(id),
  last_checked_at timestamptz not null,
  last_result varchar(20) not null check (last_result in ('CONSISTENT','DISCREPANT'))
);
create index reconciliation_checks_age on subscriptions.reconciliation_checks (last_checked_at);

create table subscriptions.reconciliation_findings (
  id uuid primary key default gen_random_uuid(),
  window_id uuid not null references infra.scheduler_windows(id),
  subscription_id uuid not null,
  account_id uuid not null,
  kind varchar(40) not null check (kind in ('REMOTE_NOT_FOUND','OWNERSHIP_MISMATCH','STATUS_MISMATCH',
    'PERIOD_MISMATCH','CANCELLATION_MISMATCH','PRICE_MISMATCH')),
  -- Normalized commercial fields only (status, period, flags, amounts); no provider payload.
  local_value jsonb not null check (jsonb_typeof(local_value) = 'object'),
  remote_value jsonb check (remote_value is null or jsonb_typeof(remote_value) = 'object'),
  source varchar(40) not null check (source ~ '^[a-z][a-z0-9-]{1,39}$'),
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  unique (window_id, subscription_id, kind),
  foreign key (subscription_id, account_id) references subscriptions.records(id, account_id)
);
create index reconciliation_findings_subscription on subscriptions.reconciliation_findings
  (subscription_id, created_at desc);
create index reconciliation_findings_time on subscriptions.reconciliation_findings (created_at desc);
create trigger reconciliation_findings_immutable before update or delete on subscriptions.reconciliation_findings
for each row execute function subscriptions.append_only();

-- Paid subscriptions not yet checked in this window, least recently checked first.
create function subscriptions.reconciliation_candidates(p_window_id uuid, p_limit integer)
returns table (subscription_id uuid, account_id uuid, provider_customer_id text,
  provider_subscription_id text, status text, amount_minor bigint, currency text,
  current_period_start timestamptz, current_period_end timestamptz, cancel_at_period_end boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_limit not between 1 and 200 then
    raise exception using errcode = '22023', message = 'Limit must be between 1 and 200';
  end if;
  return query
    select r.id, r.account_id, r.provider_customer_id::text, r.provider_subscription_id::text,
      r.status, r.amount_minor, r.currency_code, r.current_period_start, r.current_period_end,
      r.cancel_at_period_end
    from subscriptions.records r
    left join subscriptions.reconciliation_checks c on c.subscription_id = r.id
    where not r.is_demo and r.provider_subscription_id is not null and r.provider_customer_id is not null
      and (c.last_window_id is null or c.last_window_id <> p_window_id)
    order by c.last_checked_at nulls first, r.id
    limit p_limit;
end $$;

-- Stores the result of one check. Idempotent per (window, subscription, kind).
create function subscriptions.record_reconciliation(
  p_window_id uuid, p_subscription_id uuid, p_source text, p_findings jsonb
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  target subscriptions.records%rowtype;
  window_row infra.scheduler_windows%rowtype;
  finding jsonb;
  inserted integer := 0;
  added integer;
begin
  if p_findings is null or jsonb_typeof(p_findings) <> 'array' then
    raise exception using errcode = '22023', message = 'Findings must be an array';
  end if;
  select * into strict window_row from infra.scheduler_windows w where w.id = p_window_id;
  select * into strict target from subscriptions.records r where r.id = p_subscription_id;
  for finding in select value from jsonb_array_elements(p_findings) loop
    insert into subscriptions.reconciliation_findings (window_id, subscription_id, account_id, kind,
      local_value, remote_value, source, correlation_id)
    values (p_window_id, target.id, target.account_id, finding ->> 'kind', finding -> 'local',
      nullif(finding -> 'remote', 'null'::jsonb), p_source, window_row.correlation_id)
    on conflict (window_id, subscription_id, kind) do nothing;
    get diagnostics added = row_count;
    inserted := inserted + added;
  end loop;
  insert into subscriptions.reconciliation_checks (subscription_id, last_window_id, last_checked_at, last_result)
  values (target.id, p_window_id, now(),
    case when jsonb_array_length(p_findings) = 0 then 'CONSISTENT' else 'DISCREPANT' end)
  on conflict (subscription_id) do update set last_window_id = excluded.last_window_id,
    last_checked_at = excluded.last_checked_at, last_result = excluded.last_result;
  return inserted;
end $$;

-- ---------------------------------------------------------------------------------------------
alter table infra.scheduler_task_controls enable row level security;
alter table infra.scheduler_control_changes enable row level security;
alter table infra.scheduler_windows enable row level security;
alter table subscriptions.reconciliation_checks enable row level security;
alter table subscriptions.reconciliation_findings enable row level security;
revoke all on infra.scheduler_task_controls, infra.scheduler_control_changes, infra.scheduler_windows,
  subscriptions.reconciliation_checks, subscriptions.reconciliation_findings
  from public, anon, authenticated, service_role;
-- The runtime reads; every change goes through the functions below.
grant select on infra.scheduler_task_controls, infra.scheduler_control_changes, infra.scheduler_windows,
  subscriptions.reconciliation_checks, subscriptions.reconciliation_findings to service_role;
revoke all on function infra.guard_scheduler_window(), infra.record_task_scheduler_heartbeat(),
  infra.scheduler_enqueue(text, text, timestamptz, timestamptz, text),
  infra.scheduler_run_start(uuid, uuid, text, bigint, integer, uuid, integer),
  infra.scheduler_renew_lease(uuid, uuid, integer, text, bigint),
  infra.scheduler_run_finish(uuid, uuid, uuid, jsonb),
  infra.scheduler_run_fail(uuid, uuid, uuid, text, text),
  infra.scheduler_set_paused(text, boolean, text, text),
  infra.scheduler_emit_report_period(uuid, text),
  subscriptions.state_json(subscriptions.records), subscriptions.expire_due(integer, uuid),
  subscriptions.reconciliation_candidates(uuid, integer),
  subscriptions.record_reconciliation(uuid, uuid, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function infra.record_task_scheduler_heartbeat(),
  infra.scheduler_enqueue(text, text, timestamptz, timestamptz, text),
  infra.scheduler_run_start(uuid, uuid, text, bigint, integer, uuid, integer),
  infra.scheduler_renew_lease(uuid, uuid, integer, text, bigint),
  infra.scheduler_run_finish(uuid, uuid, uuid, jsonb),
  infra.scheduler_run_fail(uuid, uuid, uuid, text, text),
  infra.scheduler_set_paused(text, boolean, text, text),
  infra.scheduler_emit_report_period(uuid, text),
  subscriptions.expire_due(integer, uuid),
  subscriptions.reconciliation_candidates(uuid, integer),
  subscriptions.record_reconciliation(uuid, uuid, text, jsonb)
  to service_role;
