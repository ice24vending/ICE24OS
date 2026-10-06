begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(16);

select has_table('infra', 'integration_logs', 'Integration logs persist');
select ok(
  (select relrowsecurity from pg_class where oid = 'infra.integration_logs'::regclass),
  'Integration logs have RLS'
);
select ok(
  has_function_privilege('service_role',
    'infra.record_integration_log(text, text, text, text, text, integer, text, text, boolean, integer, text, uuid, uuid, uuid, uuid, jsonb, timestamptz)',
    'EXECUTE')
  and has_function_privilege('service_role', 'infra.purge_integration_logs(integer, integer)', 'EXECUTE')
  and has_table_privilege('service_role', 'infra.integration_logs', 'SELECT')
  and not has_table_privilege('service_role', 'infra.integration_logs', 'INSERT')
  and not has_table_privilege('service_role', 'infra.integration_logs', 'DELETE')
  and not has_table_privilege('authenticated', 'infra.integration_logs', 'SELECT')
  and not has_function_privilege('authenticated', 'infra.purge_integration_logs(integer, integer)', 'EXECUTE'),
  'The runtime reads and calls functions only; browsers have no access'
);
select results_eq(
  $$select string_agg(r.code, ',' order by r.code) from authz.role_permissions rp
    join authz.roles r on r.id = rp.role_id join authz.permissions p on p.id = rp.permission_id
    where p.code = 'integration-logs.read'$$,
  $$values ('IA'::text)$$,
  'Only ICE24 administration reads integration logs (RF-ADM-009)'
);

-- Attempts are distinct rows; a repeated attempt is ignored.
select ok(
  infra.record_integration_log('email', 'message.send', 'OUTBOUND', 'local', 'FAILED', 12, null,
    'PROVIDER_UNAVAILABLE', true, 1, 'msg-pgtap', 'f1000000-0000-4000-8000-000000000001', null,
    null, null, '{"template":"alert.critical@1"}', now()),
  'First attempt is recorded');
select ok(
  infra.record_integration_log('email', 'message.send', 'OUTBOUND', 'local', 'SUCCEEDED', 9, 'accepted',
    null, null, 2, 'msg-pgtap', 'f1000000-0000-4000-8000-000000000001', null, null, null, '{}', now()),
  'A retry is a new attempt');
select ok(
  not infra.record_integration_log('email', 'message.send', 'OUTBOUND', 'local', 'SUCCEEDED', 9, 'accepted',
    null, null, 2, 'msg-pgtap', 'f1000000-0000-4000-8000-000000000001', null, null, null, '{}', now()),
  'The same effect and attempt is never recorded twice');
select is(
  (select count(*)::integer from infra.integration_logs where effect_key = 'msg-pgtap'), 2,
  'Two attempts, two rows');
select is(
  (select request_correlation_id from infra.integration_logs where effect_key = 'msg-pgtap' and attempt = 1),
  null, 'A request correlation equal to the correlation is not duplicated');

-- TRD 54: no URLs, signed paths, secrets, tokens or nested payloads.
select throws_ok(
  $$select infra.record_integration_log('object_storage', 'read.sign', 'OUTBOUND', 'supabase-storage',
    'SUCCEEDED', 1, '200', null, null, 1, null, gen_random_uuid(), null, null, null,
    '{"note":"https://proj.supabase.co/storage/v1/object/sign/a?token=x"}', now())$$,
  '23514', null, 'URLs are rejected');
select throws_ok(
  $$select infra.record_integration_log('stripe', 'checkout.session.create', 'OUTBOUND', 'stripe',
    'SUCCEEDED', 1, '200', null, null, 1, null, gen_random_uuid(), null, null, null,
    '{"key":"sk_live_abc"}', now())$$,
  '23514', null, 'Secrets are rejected');
select throws_ok(
  $$select infra.record_integration_log('stripe', 'webhook.receive', 'INBOUND', 'stripe',
    'SUCCEEDED', 1, '200', null, null, 1, null, gen_random_uuid(), null, null, null,
    '{"payload":{"card":"4242"}}', now())$$,
  '23514', null, 'Nested payloads are rejected');
select throws_ok(
  $$select infra.record_integration_log('stripe', 'webhook.receive', 'INBOUND', 'stripe',
    'FAILED', 1, '503', null, null, 1, null, gen_random_uuid(), null, null, null, '{}', now())$$,
  '23514', null, 'A failure always carries a diagnostic code');

-- Append-only, except the configurable retention.
select throws_ok($$update infra.integration_logs set latency_ms = 0$$, '55000', null, 'Logs are immutable');
select throws_ok($$delete from infra.integration_logs$$, '55000', null, 'Logs are not deleted directly');
select infra.record_integration_log('queue', 'message.consume', 'OUTBOUND', 'pgmq', 'SUCCEEDED', 1, null,
  null, null, 1, null, 'f1000000-0000-4000-8000-000000000002', null, null, null, '{}',
  now() - interval '400 days');
select is(infra.purge_integration_logs(365), 1, 'Retention purges only rows older than the period');

select * from finish();
rollback;
