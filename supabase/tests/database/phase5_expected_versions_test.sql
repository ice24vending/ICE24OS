begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(15);

-- Privileges: the runtime only executes the wrappers; browsers have no access.
select ok(
  has_function_privilege('service_role',
    'infra.retry_dead_letter_job_expected(uuid, integer, uuid, uuid, text, text, uuid)', 'EXECUTE')
  and has_function_privilege('service_role',
    'notifications.transition_expected(uuid, uuid, uuid, uuid, text, jsonb, text, uuid, integer)', 'EXECUTE')
  and not has_function_privilege('authenticated',
    'infra.retry_dead_letter_job_expected(uuid, integer, uuid, uuid, text, text, uuid)', 'EXECUTE')
  and not has_function_privilege('anon',
    'notifications.transition_expected(uuid, uuid, uuid, uuid, text, jsonb, text, uuid, integer)', 'EXECUTE'),
  'Expected-version wrappers are executable by the runtime only'
);

-- Job fixture: one delivery exhausted into DEAD_LETTER (same path as phase5_jobs_test).
insert into identity.users (id, identity_subject, username, email, display_name, status) values
  ('b1000000-0000-4000-8000-000000000001', 'version-support', 'version-support',
   'version-support@example.test', 'Version support', 'ACTIVE');
create temp table event_message on commit drop as select jsonb_build_object(
  'messageVersion', 1, 'eventId', 'b2000000-0000-4000-8000-000000000001', 'type', 'SyntheticRecorded',
  'eventVersion', 1, 'aggregateType', 'Synthetic', 'aggregateId', 'b2000000-0000-4000-8000-000000000001',
  'aggregateVersion', 0, 'accountId', null, 'actor', jsonb_build_object('type', 'SYSTEM', 'userId', null),
  'contextSessionId', null, 'correlationId', 'b3000000-0000-4000-8000-000000000001', 'causationId', null,
  'occurredAt', '2026-10-06T12:00:00.000000Z', 'sensitivity', 'internal', 'payload', '{}'::jsonb) as message;
select pgmq.send('domain_events', (select message from event_message));
create temp table delivery on commit drop as
  select * from infra.read_queue('domain_events', 30, 10) r
  where r.message ->> 'eventId' = 'b2000000-0000-4000-8000-000000000001';
create temp table job on commit drop as
  select * from infra.job_start_delivery('domain_events', (select msg_id from delivery), 5,
    (select message from delivery));
select is(infra.fail_job('domain_events', (select msg_id from delivery), (select message from delivery), 5,
  'PROVIDER_TIMEOUT'), 'dead_lettered', 'Fixture job is dead-lettered');
select is(infra.job_finish((select job_id from job), 'dead_lettered', 'PROVIDER_TIMEOUT'), 'DEAD_LETTER',
  'Fixture job is DEAD_LETTER');
create temp table seen on commit drop as
  select row_version from infra.async_jobs where id = (select job_id from job);

select throws_ok(
  $$select * from infra.retry_dead_letter_job_expected((select job_id from job), 0,
    'b1000000-0000-4000-8000-000000000001', null, 'Provider recovered after INC-7', 'version-key-0001', null)$$,
  '22023', null, 'A positive expected version is required'
);
select throws_ok(
  $$select * from infra.retry_dead_letter_job_expected('b9000000-0000-4000-8000-000000000009', 1,
    'b1000000-0000-4000-8000-000000000001', null, 'Provider recovered after INC-7', 'version-key-0001', null)$$,
  'IC404', null, 'An unknown job is not found'
);
select throws_ok(
  $$select * from infra.retry_dead_letter_job_expected((select job_id from job),
    (select row_version + 1 from seen), 'b1000000-0000-4000-8000-000000000001', null,
    'Provider recovered after INC-7', 'version-key-0001', null)$$,
  'ICVER', null, 'A stale expected version is rejected'
);
select is(
  (select count(*)::integer from audit.events where entity_id = (select job_id from job)
     and operation = 'JobRetryRequested'),
  0, 'A rejected version changes and audits nothing'
);
select is(
  (select status from infra.retry_dead_letter_job_expected((select job_id from job),
    (select row_version from seen), 'b1000000-0000-4000-8000-000000000001', null,
    'Provider recovered after INC-7', 'version-key-0001', null)),
  'QUEUED', 'The matching version re-queues the job'
);
select is(
  (select status from infra.retry_dead_letter_job_expected((select job_id from job),
    (select row_version from seen), 'b1000000-0000-4000-8000-000000000001', null,
    'Provider recovered after INC-7', 'version-key-0001', null)),
  'QUEUED', 'A replayed key with the pre-retry version is answered, not rejected'
);
select is(
  (select count(*)::integer from audit.events where entity_id = (select job_id from job)
     and operation = 'JobRetryRequested'),
  1, 'The retry is audited once'
);

-- Notification fixture: one critical alert for one recipient.
insert into identity.accounts (id, name, account_type) values
  ('b4000000-0000-4000-8000-00000000000a', 'Versions A', 'COMPANY');
insert into notifications.notification_events (id, event_type, origin_event_id, origin_event_type,
  account_id, source_type, source_id, priority, title, message, occurred_at, correlation_id) values
  ('b5000000-0000-4000-8000-000000000001', 'subscription.payment_failed',
   'b6000000-0000-4000-8000-000000000001', 'PaymentFailed', 'b4000000-0000-4000-8000-00000000000a',
   'Subscription', 'b7000000-0000-4000-8000-000000000001', 'CRITICAL', 'Pago rechazado',
   'Synthetic alert', now(), 'b8000000-0000-4000-8000-000000000001');
insert into notifications.notification_recipients (id, notification_event_id, account_id, user_id) values
  ('b5100000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-000000000001',
   'b4000000-0000-4000-8000-00000000000a', 'b1000000-0000-4000-8000-000000000001');

select throws_ok(
  $$select notifications.transition_expected('b5100000-0000-4000-8000-000000000001',
    'b4000000-0000-4000-8000-00000000000a', 'b1000000-0000-4000-8000-000000000001', null, 'ACKNOWLEDGE',
    null, 'ack-key-0001', 'b8000000-0000-4000-8000-000000000002', 2)$$,
  'ICVER', null, 'A stale notification version is rejected'
);
select throws_ok(
  $$select notifications.transition_expected('b5100000-0000-4000-8000-000000000001',
    'b4000000-0000-4000-8000-00000000000b', 'b1000000-0000-4000-8000-000000000001', null, 'ACKNOWLEDGE',
    null, 'ack-key-0001', 'b8000000-0000-4000-8000-000000000002', 1)$$,
  'IC404', null, 'Another account cannot reach the recipient row'
);
select is(
  notifications.transition_expected('b5100000-0000-4000-8000-000000000001',
    'b4000000-0000-4000-8000-00000000000a', 'b1000000-0000-4000-8000-000000000001', null, 'ACKNOWLEDGE',
    null, 'ack-key-0001', 'b8000000-0000-4000-8000-000000000002', 1),
  'b5100000-0000-4000-8000-000000000001'::uuid, 'The matching version acknowledges the alert'
);
select is(
  (select status::text || ':' || row_version from notifications.notification_recipients
     where id = 'b5100000-0000-4000-8000-000000000001'),
  'ACKNOWLEDGED:2', 'The acknowledgement advanced the version'
);
select lives_ok(
  $$select notifications.transition_expected('b5100000-0000-4000-8000-000000000001',
    'b4000000-0000-4000-8000-00000000000a', 'b1000000-0000-4000-8000-000000000001', null, 'ACKNOWLEDGE',
    null, 'ack-key-0001', 'b8000000-0000-4000-8000-000000000002', 1)$$,
  'A replayed key with the pre-acknowledge version is answered, not rejected'
);

select * from finish();
rollback;
