begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(23);

-- Structure, privileges and queue.
select has_table('infra', 'scheduler_windows', 'Scheduler windows persist');
select has_table('infra', 'scheduler_task_controls', 'Task pauses persist');
select has_table('subscriptions', 'reconciliation_findings', 'Reconciliation findings persist');
select ok(
  (select bool_and(c.relrowsecurity) from pg_class c
    where c.oid in ('infra.scheduler_windows'::regclass, 'infra.scheduler_task_controls'::regclass,
      'infra.scheduler_control_changes'::regclass, 'subscriptions.reconciliation_checks'::regclass,
      'subscriptions.reconciliation_findings'::regclass)),
  'Every scheduler table has RLS'
);
select ok(
  has_function_privilege('service_role', 'infra.scheduler_enqueue(text, text, timestamptz, timestamptz, text)', 'EXECUTE')
  and has_function_privilege('service_role', 'infra.scheduler_run_start(uuid, uuid, text, bigint, integer, uuid, integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'subscriptions.expire_due(integer, uuid)', 'EXECUTE')
  and not has_function_privilege('service_role', 'subscriptions.state_json(subscriptions.records)', 'EXECUTE')
  and not has_table_privilege('service_role', 'infra.scheduler_windows', 'UPDATE')
  and not has_table_privilege('service_role', 'infra.scheduler_windows', 'INSERT')
  and not has_table_privilege('service_role', 'subscriptions.reconciliation_findings', 'INSERT')
  and not has_table_privilege('authenticated', 'infra.scheduler_windows', 'SELECT')
  and not has_function_privilege('authenticated', 'infra.scheduler_set_paused(text, boolean, text, text)', 'EXECUTE'),
  'The runtime reads and calls functions only; browsers have no access'
);
select results_eq(
  $$select dead_letter_queue || ':' || max_attempts || ':' || visibility_timeout_seconds
    from infra.queue_policies where queue_name = 'scheduled_tasks'$$,
  $$values ('scheduled_tasks_dlq:5:300'::text)$$,
  'The window queue has a DLQ, bounded retries and a lease-sized visibility timeout'
);
select ok(
  exists (select 1 from pgmq.list_queues() q where q.queue_name = 'scheduled_tasks')
  and exists (select 1 from pgmq.list_queues() q where q.queue_name = 'scheduled_tasks_dlq'),
  'PGMQ queues exist'
);

-- Enqueue: one window, job and message per (task, window), never before it closes.
select is(
  infra.scheduler_enqueue('test.pgtap', '2026-10-01T10:05:00.000Z', '2026-10-01T10:00:00Z',
    '2026-10-01T10:05:00Z', 'UTC'),
  'ENQUEUED', 'A closed window is enqueued');
select is(
  infra.scheduler_enqueue('test.pgtap', '2026-10-01T10:05:00.000Z', '2026-10-01T10:00:00Z',
    '2026-10-01T10:05:00Z', 'UTC'),
  'EXISTS', 'The same window is never enqueued twice');
select results_eq(
  $$select j.job_type || ':' || j.status || ':' || j.queue_name || ':' || (j.message_id is not null)
    from infra.scheduler_windows w join infra.async_jobs j on j.id = w.job_id where w.task_name = 'test.pgtap'$$,
  $$values ('SCHEDULED_TASK:QUEUED:scheduled_tasks:true'::text)$$,
  'The window has one SCHEDULED_TASK job in the job registry'
);
select is(
  infra.scheduler_enqueue('test.pgtap', '2999-01-01T00:00:00.000Z', '2998-12-31T00:00:00Z',
    '2999-01-01T00:00:00Z', 'UTC'),
  'EARLY', 'A window is not enqueued before it closes by the database clock');

-- Lease: one owner at a time; a takeover after expiry is recorded.
create temporary table delivery as
  select msg_id, read_ct, message from infra.read_queue('scheduled_tasks', 300, 10)
  where message ->> 'task' = 'test.pgtap';
select is(
  (select action from delivery d, infra.scheduler_run_start((d.message ->> 'jobId')::uuid,
    (d.message ->> 'windowId')::uuid, 'scheduled_tasks', d.msg_id, d.read_ct,
    'a0000000-0000-4000-8000-00000000000a', 300)),
  'RUN', 'The first worker takes the lease');
select is(
  (select action from delivery d, infra.scheduler_run_start((d.message ->> 'jobId')::uuid,
    (d.message ->> 'windowId')::uuid, 'scheduled_tasks', d.msg_id, d.read_ct,
    'b0000000-0000-4000-8000-00000000000b', 300)),
  'BUSY', 'A second worker cannot run a leased window');
update infra.scheduler_windows set lease_expires_at = now() - interval '1 second' where task_name = 'test.pgtap';
select results_eq(
  $$select action || ':' || recovered from delivery d, infra.scheduler_run_start((d.message ->> 'jobId')::uuid,
    (d.message ->> 'windowId')::uuid, 'scheduled_tasks', d.msg_id, d.read_ct,
    'b0000000-0000-4000-8000-00000000000b', 300)$$,
  $$values ('RUN:true'::text)$$,
  'An expired lease is taken over and marked as recovered'
);
select is(
  (select infra.scheduler_run_finish((d.message ->> 'windowId')::uuid, (d.message ->> 'jobId')::uuid,
    'a0000000-0000-4000-8000-00000000000a', '{}') from delivery d),
  'LEASE_LOST', 'The previous owner can no longer record a result');
select is(
  (select infra.scheduler_run_finish((d.message ->> 'windowId')::uuid, (d.message ->> 'jobId')::uuid,
    'b0000000-0000-4000-8000-00000000000b', '{"items":1}') from delivery d),
  'SUCCEEDED', 'The current owner completes the window');
select results_eq(
  $$select w.status || ':' || w.recovered_count || ':' || j.status
    from infra.scheduler_windows w join infra.async_jobs j on j.id = w.job_id where w.task_name = 'test.pgtap'$$,
  $$values ('SUCCEEDED:1:SUCCEEDED'::text)$$,
  'Window and job finish together'
);
select is(
  (select action from delivery d, infra.scheduler_run_start((d.message ->> 'jobId')::uuid,
    (d.message ->> 'windowId')::uuid, 'scheduled_tasks', d.msg_id, d.read_ct,
    'c0000000-0000-4000-8000-00000000000c', 300)),
  'DONE', 'A completed window never runs again');

-- Expirations: validated transitions, SYSTEM history and WORKER audit, no repetition.
insert into identity.accounts (id, name, account_type) values
  ('f1000000-0000-4000-8000-00000000000a', 'Sched A', 'COMPANY');
insert into identity.users (id, identity_subject, username, email, display_name, status) values
  ('f2000000-0000-4000-8000-000000000001', 'sched-owner', 'sched-owner', 'sched-owner@example.test', 'Owner', 'ACTIVE');
insert into subscriptions.records (id, account_id, status, is_demo, demo_expires_at, created_by, updated_by) values
  ('f3000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-00000000000a', 'demo', true,
    now() - interval '1 minute', 'f2000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001');
select results_eq(
  $$select demos || ':' || cancellations from subscriptions.expire_due(50, gen_random_uuid())$$,
  $$values ('1:0'::text)$$,
  'An expired demo is materialized'
);
select results_eq(
  $$select demos || ':' || cancellations from subscriptions.expire_due(50, gen_random_uuid())$$,
  $$values ('0:0'::text)$$,
  'A repeated run finds nothing left to do'
);
select results_eq(
  $$select r.status || ':' || e.event_type || ':' || e.actor_type || ':' || a.origin || ':' || i.access_mode
    from subscriptions.records r
    join subscriptions.events e on e.subscription_id = r.id
    join audit.events a on a.id = e.id
    join identity.accounts i on i.id = r.account_id
    where r.id = 'f3000000-0000-4000-8000-000000000001'$$,
  $$values ('read_only:DEMO_EXPIRED:SYSTEM:WORKER:READ_ONLY'::text)$$,
  'History, central audit and access are recorded once'
);
select throws_ok(
  $$insert into subscriptions.events (subscription_id, account_id, actor_id, context_id, correlation_id,
    event_type, reason, new_state, actor_type, provider_event_id) values
    ('f3000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-00000000000a', null, null,
     gen_random_uuid(), 'X', 'System events cannot carry a provider id', '{}', 'SYSTEM', 'evt_x')$$,
  '23514', null, 'A SYSTEM event cannot impersonate a provider event'
);
select throws_ok(
  $$delete from infra.scheduler_windows$$, '55000', null, 'Scheduler windows are never deleted'
);
select * from finish();
rollback;
