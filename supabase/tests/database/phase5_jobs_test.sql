begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(24);

select has_table('infra', 'async_jobs', 'Asynchronous job registry persists');
select has_table('infra', 'async_job_transitions', 'Job state history persists');
select ok(
  (select bool_and(relrowsecurity) from pg_class
    where oid in ('infra.async_jobs'::regclass, 'infra.async_job_transitions'::regclass)),
  'Job tables have RLS'
);
select ok(
  not has_table_privilege('service_role', 'infra.async_jobs', 'UPDATE')
  and not has_table_privilege('service_role', 'infra.async_jobs', 'INSERT')
  and not has_table_privilege('service_role', 'infra.async_job_transitions', 'INSERT')
  and not has_table_privilege('authenticated', 'infra.async_jobs', 'SELECT'),
  'State changes only through infra functions; browsers have no access'
);
select results_eq(
  $$select count(*) from authz.permissions where module_code = 'jobs'$$,
  $$values (3::bigint)$$,
  'Job permissions are seeded'
);

-- Dispatch and first delivery.
insert into identity.users (id, identity_subject, username, email, display_name, status) values
  ('81000000-0000-4000-8000-000000000001', 'jobs-support', 'jobs-support', 'jobs-support@example.test',
   'Jobs support', 'ACTIVE');
create temp table event_message on commit drop as select jsonb_build_object(
  'messageVersion', 1, 'eventId', '82000000-0000-4000-8000-000000000001', 'type', 'SyntheticRecorded',
  'eventVersion', 1, 'aggregateType', 'Synthetic', 'aggregateId', '82000000-0000-4000-8000-000000000001',
  'aggregateVersion', 0, 'accountId', null, 'actor', jsonb_build_object('type', 'SYSTEM', 'userId', null),
  'contextSessionId', null, 'correlationId', '83000000-0000-4000-8000-000000000001', 'causationId', null,
  'occurredAt', '2026-10-02T12:00:00.000000Z', 'sensitivity', 'internal', 'payload', '{}'::jsonb) as message;
select pgmq.send('domain_events', (select message from event_message));
create temp table delivery on commit drop as
  select * from infra.read_queue('domain_events', 30, 10) r
  where r.message ->> 'eventId' = '82000000-0000-4000-8000-000000000001';
create temp table job on commit drop as
  select * from infra.job_start_delivery('domain_events', (select msg_id from delivery), 1,
    (select message from delivery));
select is((select status from job), 'RUNNING', 'A delivery registers the job as RUNNING');
select results_eq(
  $$select from_status, to_status from infra.async_job_transitions
    where job_id = (select job_id from job) order by occurred_at, id$$,
  $$values (null::varchar, 'QUEUED'::varchar), ('QUEUED'::varchar, 'RUNNING'::varchar)$$,
  'History records QUEUED then RUNNING'
);

-- Temporary failure: backoff.
select is(infra.fail_job('domain_events', (select msg_id from delivery), (select message from delivery), 1,
  'PROVIDER_TIMEOUT'), 'retry_scheduled', 'The queue schedules a retry');
select is(infra.job_finish((select job_id from job), 'retry_scheduled', 'PROVIDER_TIMEOUT'), 'RETRY_WAIT',
  'The job waits for its retry');
select ok(
  (select next_attempt_at > now() and error_code = 'PROVIDER_TIMEOUT' and error_detail_user is not null
    from infra.async_jobs where id = (select job_id from job)),
  'Retry wait exposes the next attempt and a safe message'
);

-- Exhausted attempts: DLQ.
select is((select status from infra.job_start_delivery('domain_events', (select msg_id from delivery), 5,
  (select message from delivery))), 'RUNNING', 'The fifth delivery runs again');
select is(infra.fail_job('domain_events', (select msg_id from delivery), (select message from delivery), 5,
  'PROVIDER_TIMEOUT'), 'dead_lettered', 'The fifth failure is dead-lettered');
select is(infra.job_finish((select job_id from job), 'dead_lettered', 'PROVIDER_TIMEOUT'), 'DEAD_LETTER',
  'The job is marked DEAD_LETTER');
select throws_ok(
  $$update infra.async_jobs set status = 'SUCCEEDED' where id = (select job_id from job)$$,
  'IC409', null, 'Invalid transitions are rejected'
);

-- Audited manual retry (INT-004).
select throws_ok(
  $$select * from infra.retry_dead_letter_job((select job_id from job), '81000000-0000-4000-8000-000000000001',
    null, 'short', 'retry-key-0001', null)$$,
  '22023', null, 'A retry requires a meaningful reason'
);
create temp table retried on commit drop as
  select * from infra.retry_dead_letter_job((select job_id from job), '81000000-0000-4000-8000-000000000001',
    null, 'Provider recovered after incident INC-42', 'retry-key-0001', '83000000-0000-4000-8000-000000000002');
select results_eq(
  $$select status::text, manual_retry_count, attempt_count from retried$$,
  $$values ('QUEUED'::text, 1, 0)$$,
  'The job returns to QUEUED with its manual retry counted'
);
select is(
  (select count(*)::integer from pgmq.q_domain_events_dlq
    where message ->> 'sourceMessageId' = (select msg_id::text from delivery)),
  0, 'The dead letter leaves the DLQ'
);
select is(
  (select count(*)::integer from pgmq.q_domain_events
    where message ->> 'eventId' = '82000000-0000-4000-8000-000000000001'),
  1, 'The original payload is back in its queue'
);
select results_eq(
  $$select actor_type, reason, operation::text, new_values ->> 'status' from audit.events
    where entity_id = (select job_id from job) and operation = 'JobRetryRequested'$$,
  $$values ('USER'::text, 'Provider recovered after incident INC-42'::text, 'JobRetryRequested'::text, 'QUEUED'::text)$$,
  'The retry is written to central audit with actor and reason'
);
select results_eq(
  $$select actor_type, from_status::text, to_status::text from infra.async_job_transitions
    where job_id = (select job_id from job) and actor_type = 'USER'$$,
  $$values ('USER'::text, 'DEAD_LETTER'::text, 'QUEUED'::text)$$,
  'The history records who re-queued the job'
);
select * from infra.retry_dead_letter_job((select job_id from job), '81000000-0000-4000-8000-000000000001',
  null, 'Provider recovered after incident INC-42', 'retry-key-0001', null);
select is(
  (select count(*)::integer from pgmq.q_domain_events
    where message ->> 'eventId' = '82000000-0000-4000-8000-000000000001'),
  1, 'Repeating the idempotency key does not send the message again'
);
select throws_ok(
  $$select * from infra.retry_dead_letter_job((select job_id from job), '81000000-0000-4000-8000-000000000001',
    null, 'Second retry while still queued', 'retry-key-0002', null)$$,
  'IC409', null, 'Only dead-lettered or failed jobs can be retried'
);
select throws_ok(
  $$update infra.async_job_transitions set reason = 'tampered history entry'$$,
  '55000', 'Job history is append-only', 'Job history cannot be rewritten'
);
select ok(
  (select depth >= 1 and dead_letters >= 0 from infra.queue_overview() where queue_name = 'domain_events'),
  'Queue overview reports depth without PGMQ grants'
);
select * from finish();
rollback;
