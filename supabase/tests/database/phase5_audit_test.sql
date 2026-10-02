begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(9);
select has_table('audit','events','Central audit events persist');
select ok((select relrowsecurity from pg_class where oid='audit.events'::regclass),'Central audit has RLS');
select ok(not has_table_privilege('authenticated','audit.events','SELECT'),'Browser cannot read central audit');
select ok(
  not has_table_privilege('service_role','audit.events','UPDATE')
  and not has_table_privilege('service_role','audit.events','DELETE')
  and not has_table_privilege('service_role','audit.events','TRUNCATE'),
  'Service role cannot rewrite central audit'
);
select results_eq(
  $$select count(*) from authz.permissions where code in ('audit.read','audit.global-read')$$,
  $$values (2::bigint)$$,
  'Audit read permissions are seeded'
);
insert into audit.security_events (id, event_type, result, correlation_id, metadata) values
  ('51000000-0000-4000-8000-000000000001', 'LOGIN_FAILED', 'DENIED',
   '52000000-0000-4000-8000-000000000001', '{"token":"must-not-copy"}');
select results_eq(
  $$select result::text, entity_type::text, actor_type from audit.events
    where id = '51000000-0000-4000-8000-000000000001'$$,
  $$values ('DENIED'::text, 'Identity'::text, 'SYSTEM'::text)$$,
  'Security events are projected to central audit in the same transaction'
);
select ok(
  (select new_values::text not like '%must-not-copy%' from audit.events
    where id = '51000000-0000-4000-8000-000000000001'),
  'Projection does not copy arbitrary metadata'
);
select throws_ok(
  $$update audit.events set reason = 'tampered' where id = '51000000-0000-4000-8000-000000000001'$$,
  '55000', 'Audit events are append-only',
  'Central audit rejects UPDATE'
);
select throws_ok(
  $$delete from audit.events where id = '51000000-0000-4000-8000-000000000001'$$,
  '55000', 'Audit events are append-only',
  'Central audit rejects DELETE'
);
select * from finish();
rollback;
