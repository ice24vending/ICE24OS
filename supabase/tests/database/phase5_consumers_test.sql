begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(16);
select has_table('infra', 'processed_messages', 'Processed-message registry persists');
select ok((select relrowsecurity from pg_class where oid = 'infra.processed_messages'::regclass),
  'Processed messages have RLS');
select ok(
  not has_table_privilege('service_role', 'infra.processed_messages', 'INSERT')
  and not has_table_privilege('service_role', 'infra.processed_messages', 'DELETE')
  and not has_table_privilege('authenticated', 'infra.processed_messages', 'SELECT'),
  'Claims go through infra.claim_message only; browsers have no access'
);
select results_eq(
  $$select max_attempts, dead_letter_queue from infra.queue_policies where queue_name = 'domain_events'$$,
  $$values (5, 'domain_events_dlq'::text)$$,
  'domain_events retries five times before the DLQ'
);

-- Idempotent processing: the second claim of the same event by the same consumer is refused.
select pgmq.send('domain_events', '{"eventId":"71000000-0000-4000-8000-000000000001","type":"SyntheticRecorded"}');
create temp table delivered on commit drop as
  select * from infra.read_queue('domain_events', 30, 10) r
  where r.message ->> 'eventId' = '71000000-0000-4000-8000-000000000001';
select is((select read_ct from delivered), 1, 'The first delivery reports attempt 1');
select ok(
  infra.claim_message('synthetic-consumer', '71000000-0000-4000-8000-000000000001', 'SyntheticRecorded',
    'domain_events', (select msg_id from delivered), 1),
  'The first claim applies the effect'
);
select ok(
  not infra.claim_message('synthetic-consumer', '71000000-0000-4000-8000-000000000001', 'SyntheticRecorded',
    'domain_events', (select msg_id from delivered) + 1000, 2),
  'A redelivered event is skipped by the same consumer'
);
select ok(
  infra.claim_message('other-consumer', '71000000-0000-4000-8000-000000000001', 'SyntheticRecorded',
    'domain_events', (select msg_id from delivered), 1),
  'Each consumer keeps its own idempotency record'
);
select throws_ok(
  $$update infra.processed_messages set attempt = 9$$,
  '55000', 'Processed messages are append-only', 'Processed messages cannot be rewritten'
);
select ok(infra.ack_message('domain_events', (select msg_id from delivered)), 'Ack archives the message');
select is(
  (select count(*)::integer from infra.read_queue('domain_events', 30, 100) r
    where r.message ->> 'eventId' = '71000000-0000-4000-8000-000000000001'),
  0, 'An acknowledged message is not delivered again'
);

-- Failures: backoff while attempts remain, DLQ when exhausted.
select pgmq.send('domain_events', '{"eventId":"71000000-0000-4000-8000-000000000002","type":"SyntheticFailed"}');
create temp table failing on commit drop as
  select * from infra.read_queue('domain_events', 30, 10) r
  where r.message ->> 'eventId' = '71000000-0000-4000-8000-000000000002';
select is(
  infra.fail_job('domain_events', (select msg_id from failing), (select message from failing), 1, 'HANDLER_FAILED'),
  'retry_scheduled', 'A failure with attempts left schedules a retry'
);
select is(
  (select count(*)::integer from infra.read_queue('domain_events', 30, 100) r
    where r.message ->> 'eventId' = '71000000-0000-4000-8000-000000000002'),
  0, 'The retried message stays invisible during its backoff'
);
select is(
  infra.fail_job('domain_events', (select msg_id from failing), (select message from failing), 5, 'HANDLER_FAILED'),
  'dead_lettered', 'The fifth failure moves the message to the DLQ'
);
select results_eq(
  $$select message ->> 'failureCode', message -> 'payload' ->> 'eventId' from pgmq.q_domain_events_dlq
    where message -> 'payload' ->> 'eventId' = '71000000-0000-4000-8000-000000000002'$$,
  $$values ('HANDLER_FAILED'::text, '71000000-0000-4000-8000-000000000002'::text)$$,
  'The DLQ keeps the original payload and the failure code'
);
select throws_ok(
  $$select * from infra.read_queue('pgmq_internal', 30, 1)$$,
  '22023', 'Unknown queue', 'Workers cannot read queues without a policy'
);
select * from finish();
rollback;
