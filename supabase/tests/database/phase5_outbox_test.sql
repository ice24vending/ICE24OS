begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(15);
select has_table('infra', 'outbox_events', 'Transactional outbox persists');
select ok((select relrowsecurity from pg_class where oid = 'infra.outbox_events'::regclass), 'Outbox has RLS');
select ok(
  not has_table_privilege('authenticated', 'infra.outbox_events', 'SELECT')
  and not has_table_privilege('service_role', 'infra.outbox_events', 'DELETE'),
  'Browsers cannot read the outbox and the service role cannot delete it'
);

insert into audit.security_events (id, event_type, result, correlation_id, metadata) values
  ('61000000-0000-4000-8000-000000000001', 'LOGIN_FAILED', 'DENIED',
   '62000000-0000-4000-8000-000000000001', '{"token":"must-not-copy"}');
select results_eq(
  $$select event_type::text, aggregate_type::text, actor_type, sensitivity::text, published_at is null
    from infra.outbox_events where id = '61000000-0000-4000-8000-000000000001'$$,
  $$values ('LoginFailed'::text, 'Identity'::text, 'SYSTEM'::text, 'confidential'::text, true)$$,
  'Producer events enter the outbox in the same transaction'
);
select ok(
  (select payload::text not like '%must-not-copy%' from infra.outbox_events
    where id = '61000000-0000-4000-8000-000000000001'),
  'Outbox payload keeps only allow-listed fields'
);
select throws_ok(
  $$update infra.outbox_events set event_type = 'Tampered' where id = '61000000-0000-4000-8000-000000000001'$$,
  '55000', 'Outbox event facts are immutable', 'Event facts cannot change'
);
select throws_ok(
  $$delete from infra.outbox_events where id = '61000000-0000-4000-8000-000000000001'$$,
  '55000', 'Outbox events are append-only', 'Outbox rejects DELETE'
);

select results_eq(
  $$select published >= 1, failed from infra.publish_outbox(500)$$,
  $$values (true, 0)$$,
  'The publisher sends pending events'
);
select results_eq(
  $$select count(*) from pgmq.q_domain_events
    where message ->> 'eventId' = '61000000-0000-4000-8000-000000000001'
      and message ->> 'type' = 'LoginFailed'
      and message ->> 'messageVersion' = '1'$$,
  $$values (1::bigint)$$,
  'The versioned message reaches the domain_events queue'
);
select ok(
  (select published_at is not null and attempt_count = 1 from infra.outbox_events
    where id = '61000000-0000-4000-8000-000000000001'),
  'The event is marked published atomically with the send'
);
select is(
  (select published from infra.publish_outbox(500)), 0, 'Republishing does not send published events again'
);
select results_eq(
  $$select count(*) from pgmq.q_domain_events
    where message ->> 'eventId' = '61000000-0000-4000-8000-000000000001'$$,
  $$values (1::bigint)$$,
  'Each event is sent once'
);
-- A failed send must keep the event pending, visible and scheduled for retry.
select pgmq.drop_queue('domain_events');
insert into audit.security_events (id, event_type, result, correlation_id, metadata) values
  ('61000000-0000-4000-8000-000000000002', 'LOGIN_FAILED', 'DENIED',
   '62000000-0000-4000-8000-000000000002', '{}');
select results_eq(
  $$select published, failed from infra.publish_outbox(500)$$,
  $$values (0, 1)$$,
  'A failed send is reported, not lost'
);
select ok(
  (select published_at is null and attempt_count = 1 and last_error_code is not null
      and available_at > now()
    from infra.outbox_events where id = '61000000-0000-4000-8000-000000000002'),
  'The failed event stays pending with diagnostics and backoff'
);
select ok(
  (select pending >= 1 and failing >= 1 from infra.outbox_status),
  'Outbox status exposes pending and failing events'
);
select * from finish();
rollback;
