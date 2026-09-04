begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(18);

select has_schema('identity', 'identity schema exists');
select has_schema('authz', 'authorization schema exists');
select has_schema('audit', 'security audit schema exists');
select has_table('identity', 'users', 'global user profiles exist');
select has_table('identity', 'account_memberships', 'tenant memberships exist');
select has_table('identity', 'context_sessions', 'context sessions exist');
select has_table('identity', 'recovery_approvals', 'dual-control recovery approvals exist');
select has_table('audit', 'security_events', 'append-only security audit exists');
select has_table('identity', 'idempotency_records', 'critical identity writes are idempotent');

select results_eq(
  $$select count(*) from authz.roles where code in ('IA','IO','OW','TC','OP','SA','DV','RA','AU')$$,
  $$values (9::bigint)$$,
  'the nine approved base roles are seeded'
);
select results_eq(
  $$select count(*) from authz.permissions where module_code in ('identity','accounts','audit')$$,
  $$values (8::bigint)$$,
  'Phase 3 permissions are seeded'
);
select ok(
  (select bool_and(relation.relrowsecurity)
   from pg_class relation join pg_namespace namespace on namespace.oid = relation.relnamespace
   where namespace.nspname in ('identity','authz','audit') and relation.relkind = 'r'),
  'RLS is enabled on every Phase 3 table'
);

insert into identity.users (id, identity_subject, username, email, display_name, status) values
  ('30000000-0000-4000-8000-000000000001', 'subject-a', 'owner-a', 'owner-a@example.test', 'Owner A', 'ACTIVE'),
  ('30000000-0000-4000-8000-000000000002', 'subject-b', 'owner-b', 'owner-b@example.test', 'Owner B', 'ACTIVE'),
  ('30000000-0000-4000-8000-000000000003', 'subject-op-a', 'operator-a', 'operator-a@example.test', 'Operator A', 'ACTIVE'),
  ('30000000-0000-4000-8000-000000000004', 'subject-op-b', 'operator-b', 'operator-b@example.test', 'Operator B', 'ACTIVE');
insert into identity.accounts (id, name, account_type) values
  ('31000000-0000-4000-8000-000000000001', 'Account A', 'COMPANY'),
  ('31000000-0000-4000-8000-000000000002', 'Account B', 'COMPANY');
insert into identity.account_memberships (id, account_id, user_id, status, is_primary_owner) values
  ('32000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'ACTIVE', true),
  ('32000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'ACTIVE', true);

select lives_ok(
  $$select identity.activate_context(
    '30000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001',
    'identity-session-a', 'aal2', null, 'Test browser', '33000000-0000-4000-8000-000000000001')$$,
  'a user can activate its own active membership context'
);
select throws_ok(
  $$select identity.activate_context(
    '30000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000002',
    'identity-session-a', 'aal2', null, 'Test browser', '33000000-0000-4000-8000-000000000002')$$,
  'P0002', null,
  'cross-account context activation is rejected'
);
select results_eq(
  $$select count(*) from audit.security_events where event_type = 'CONTEXT_ACTIVATED'$$,
  $$values (1::bigint)$$,
  'context activation is audited'
);

insert into identity.recovery_cases (id, user_id, requested_channel, request_reason) values
  ('34000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'SUPPORT_CASE', 'Lost access to verified email');
select lives_ok(
  $$select identity.approve_recovery_case(
    '34000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003',
    'registered-contact', '["case:one"]', 'Evidence independently verified', 1,
    '35000000-0000-4000-8000-000000000001')$$,
  'the first independent recovery approval is recorded'
);
select lives_ok(
  $$select identity.approve_recovery_case(
    '34000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004',
    'registered-contact', '["case:two"]', 'Second operator independently verified', 2,
    '35000000-0000-4000-8000-000000000002')$$,
  'a distinct second operator can approve recovery'
);
select is(
  (select status from identity.recovery_cases where id = '34000000-0000-4000-8000-000000000001'),
  'APPROVED',
  'two distinct approvals are required before recovery is approved'
);

select * from finish();
rollback;
