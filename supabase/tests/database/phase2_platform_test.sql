begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(11);

select has_schema('infra', 'the infrastructure schema exists');
select has_table('infra', 'queue_policies', 'queue policies are versioned');
select has_table('infra', 'job_dispatches', 'the transactional outbox exists');

select results_eq(
  $$select count(*) from infra.queue_policies$$,
  $$values (2::bigint)$$,
  'general and PDF retry policies exist'
);

select results_eq(
  $$
    select count(*)
    from pgmq.list_queues()
    where queue_name in ('general_jobs', 'general_jobs_dlq', 'pdf_jobs', 'pdf_jobs_dlq')
  $$,
  $$values (4::bigint)$$,
  'all durable queues and dead-letter queues exist'
);

create temporary table phase2_test_messages (
  first_id bigint not null,
  second_id bigint
);

insert into phase2_test_messages (first_id)
values (
  infra.enqueue_job(
    'general_jobs',
    '10000000-0000-4000-8000-000000000001'::uuid,
    'phase2-idempotency-key',
    '{"kind":"phase2-test"}'::jsonb
  )
);

update phase2_test_messages
set second_id = infra.enqueue_job(
  'general_jobs',
  '10000000-0000-4000-8000-000000000001'::uuid,
  'phase2-idempotency-key',
  '{"kind":"phase2-test"}'::jsonb
);

select is(
  (select first_id from phase2_test_messages),
  (select second_id from phase2_test_messages),
  'reusing an idempotency key does not enqueue a duplicate'
);

select is(
  infra.fail_job(
    'general_jobs',
    (select first_id from phase2_test_messages),
    '{"kind":"phase2-test"}'::jsonb,
    1,
    'transient'
  ),
  'retry_scheduled'::text,
  'a transient failure schedules a retry'
);

select is(
  infra.fail_job(
    'general_jobs',
    (select first_id from phase2_test_messages),
    '{"kind":"phase2-test"}'::jsonb,
    5,
    'attempts_exhausted'
  ),
  'dead_lettered'::text,
  'an exhausted job is archived and sent to the DLQ'
);

select ok(
  (select queue_length >= 1 from pgmq.metrics('general_jobs_dlq')),
  'the general DLQ contains the exhausted job'
);

select results_eq(
  $$
    select count(*)
    from storage.buckets
    where id in ('quarantine', 'originals', 'derivatives', 'exports')
      and not public
  $$,
  $$values (4::bigint)$$,
  'all Phase 2 object buckets are private'
);

select results_eq(
  $$
    select count(*)
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'infra'
      and relation.relrowsecurity
  $$,
  $$values (5::bigint)$$,
  'RLS is enabled on every infrastructure table'
);

select * from finish();
rollback;
