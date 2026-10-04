begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(28);

-- Structure, privileges, catalog and queue.
select has_table('email', 'templates', 'Email templates are catalogued');
select has_table('email', 'messages', 'Email messages persist');
select has_table('email', 'message_events', 'Email delivery history persists');
select has_table('email', 'provider_events', 'Provider tracking events persist');
select ok(
  (select bool_and(relrowsecurity) from pg_class where relnamespace = 'email'::regnamespace and relkind = 'r'),
  'Every email table has RLS'
);
select ok(
  has_function_privilege('service_role', 'email.request(text, integer, uuid, uuid, text, jsonb, text, text, uuid, uuid, text, uuid, uuid)', 'EXECUTE')
  and has_function_privilege('service_role', 'email.delivery_start(uuid, uuid, text, bigint, integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'email.record_provider_event(text, text, text, text, timestamptz, text, uuid)', 'EXECUTE')
  and not has_function_privilege('service_role', 'email.apply_provider_event(uuid)', 'EXECUTE')
  and not has_function_privilege('service_role', 'email.write_audit(uuid, uuid, text, jsonb, jsonb, text, text, text, uuid)', 'EXECUTE')
  and not has_table_privilege('service_role', 'email.messages', 'UPDATE')
  and not has_table_privilege('service_role', 'email.messages', 'INSERT')
  and not has_schema_privilege('authenticated', 'email', 'USAGE')
  and not has_schema_privilege('anon', 'email', 'USAGE'),
  'The runtime reads and calls functions only; browsers have no access'
);
select results_eq(
  $$select string_agg(template_key || '@' || version || ':' || array_to_string(variables, '|'), ',' order by template_key, version)
    from email.templates$$,
  $$values ('alert.critical@1:accountName|actionLabel|actionPath|message|occurredAt|title,report.scheduled@1:accountName|periodLabel|reportName|reportPath'::text)$$,
  'Templates mirror EMAIL_TEMPLATES'
);
select results_eq(
  $$select dead_letter_queue || ':' || max_attempts from infra.queue_policies where queue_name = 'email_deliveries'$$,
  $$values ('email_deliveries_dlq:5'::text)$$,
  'The delivery queue has a DLQ and a bounded retry policy'
);
select ok(
  exists (select 1 from pgmq.list_queues() q where q.queue_name = 'email_deliveries')
  and exists (select 1 from pgmq.list_queues() q where q.queue_name = 'email_deliveries_dlq'),
  'PGMQ queues exist'
);
select is(
  (select count(*)::integer from information_schema.columns where table_schema = 'email'
    and (column_name like '%email%' or (column_name like '%address%' and column_name <> 'recipient_address_sha256'))),
  0, 'No email address is stored in the email schema'
);

-- Fixtures: account A with an owner and an operator, account B with its owner.
insert into identity.accounts (id, name, account_type) values
  ('e1000000-0000-4000-8000-00000000000a', 'Mail A', 'COMPANY'),
  ('e1000000-0000-4000-8000-00000000000b', 'Mail B', 'COMPANY');
insert into identity.users (id, identity_subject, username, email, display_name, status) values
  ('e2000000-0000-4000-8000-000000000001', 'mail-owner', 'mail-owner', 'mail-owner@example.test', 'Owner', 'ACTIVE'),
  ('e2000000-0000-4000-8000-000000000002', 'mail-operator', 'mail-operator', 'mail-operator@example.test', 'Operator', 'ACTIVE'),
  ('e2000000-0000-4000-8000-000000000003', 'mail-owner-b', 'mail-owner-b', 'mail-owner-b@example.test', 'Owner B', 'ACTIVE');
insert into identity.account_memberships (id, account_id, user_id, status) values
  ('e4000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-00000000000a', 'e2000000-0000-4000-8000-000000000001', 'ACTIVE'),
  ('e4000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-00000000000a', 'e2000000-0000-4000-8000-000000000002', 'ACTIVE'),
  ('e4000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-00000000000b', 'e2000000-0000-4000-8000-000000000003', 'ACTIVE');
insert into authz.membership_roles (membership_id, role_id)
select m.id, r.id from (values
  ('e4000000-0000-4000-8000-000000000001'::uuid, 'OW'), ('e4000000-0000-4000-8000-000000000002'::uuid, 'OP'),
  ('e4000000-0000-4000-8000-000000000003'::uuid, 'OW')) m(id, code)
join authz.roles r on r.code = m.code;
insert into authz.user_scopes (membership_id, scope_type) values
  ('e4000000-0000-4000-8000-000000000001', 'ACCOUNT'),
  ('e4000000-0000-4000-8000-000000000002', 'ACCOUNT'),
  ('e4000000-0000-4000-8000-000000000003', 'ACCOUNT');
insert into identity.context_sessions (id, user_id, account_id, membership_id) values
  ('e5000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001',
   'e1000000-0000-4000-8000-00000000000a', 'e4000000-0000-4000-8000-000000000001');
insert into subscriptions.records (id, account_id, provider_customer_id, provider_subscription_id, status,
  current_period_start, current_period_end, is_demo, created_by, updated_by) values
  ('e6000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-00000000000a', 'cus_mail_a', 'sub_mail_a',
   'payment_failed', now() - interval '20 days', now() + interval '10 days', false,
   'e2000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001');

-- Real producer → outbox → notification ingest → email.enqueue_alert (both consumers).
insert into subscriptions.events (id, subscription_id, account_id, actor_id, context_id, correlation_id,
  event_type, reason, previous_state, new_state, actor_type)
values ('e7000000-0000-4000-8000-000000000001', 'e6000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-00000000000a', 'e2000000-0000-4000-8000-000000000001',
  'e5000000-0000-4000-8000-000000000001', 'e8000000-0000-4000-8000-000000000001', 'payment_failed',
  'Stripe reported a failed renewal charge', '{"status":"active"}', '{"status":"payment_failed"}', 'USER');
create temp table outbox_message on commit drop as
  select infra.outbox_message(o) as message from infra.outbox_events o where o.id = 'e7000000-0000-4000-8000-000000000001';
select is(
  email.enqueue_alert((select message from outbox_message)), -1,
  'Before the alert exists the consumer is told to retry'
);
select is(notifications.ingest_event((select message from outbox_message)), 1, 'The alert reaches the owner');
select is(
  email.enqueue_alert((select message from outbox_message)), 1,
  'A critical alert queues one email per authorized recipient'
);
select is(
  email.enqueue_alert((select message from outbox_message)), 1,
  'Repeating the consumer returns the same message without queuing again'
);
select is(
  (select count(*)::integer from email.messages where origin_event_id = 'e7000000-0000-4000-8000-000000000001'),
  1, 'Only one message exists for the alert recipient'
);
create temp table queued on commit drop as
  select m.* from email.messages m where m.origin_event_id = 'e7000000-0000-4000-8000-000000000001';
select results_eq(
  $$select q.status, q.recipient_user_id::text, j.job_type::text, j.status::text
    from queued q join infra.async_jobs j on j.id = q.job_id$$,
  $$values ('QUEUED'::varchar, 'e2000000-0000-4000-8000-000000000001'::text, 'EMAIL'::text, 'QUEUED'::text)$$,
  'The message, its EMAIL job and the owner as recipient are recorded'
);
select ok(
  exists (select 1 from pgmq.q_email_deliveries q where q.message ->> 'emailMessageId' = (select id::text from queued)),
  'The delivery message is in the real PGMQ queue'
);
select is(
  (select count(*)::integer from audit.events where entity_type = 'EmailMessage' and operation = 'EmailQueued'
    and entity_id = (select id from queued) and actor_type = 'SYSTEM' and origin = 'WORKER'),
  1, 'Queuing is audited'
);
select is(
  (select status::text from notifications.notification_delivery_attempts
    where channel = 'EMAIL' and notification_recipient_id = (select notification_recipient_id from queued)),
  'QUEUED', 'The email channel attempt is visible to the notification center'
);

-- Delivery lifecycle through the worker functions.
select is(
  (select action from email.delivery_start((select job_id from queued), (select id from queued),
    'email_deliveries', 1, 1)),
  'SEND', 'The worker gets SEND with the address resolved at send time'
);
select is(
  email.delivery_record_sent((select job_id from queued), (select id from queued), 'local', 'local-msg-1',
    encode(sha256('mail-owner@example.test'::bytea), 'hex'), 1),
  'SENT', 'The accepted send is recorded'
);
select is(
  (select action from email.delivery_start((select job_id from queued), (select id from queued),
    'email_deliveries', 2, 2)),
  'DONE', 'A redelivered queue message after SENT does not send again'
);
select is(
  email.record_provider_event('local', 'evt-1', 'DELIVERED', 'local-msg-1', now(), repeat('a', 64), null),
  'APPLIED', 'A verified delivery event moves the message to DELIVERED'
);
select is(
  email.record_provider_event('local', 'evt-1', 'DELIVERED', 'local-msg-1', now(), repeat('a', 64), null),
  'DUPLICATE', 'A repeated provider event is idempotent'
);
select throws_ok(
  $$select email.record_provider_event('local', 'evt-1', 'BOUNCED', 'local-msg-1', now(), repeat('b', 64), null)$$,
  'IC409', null, 'A provider event id reused with other content conflicts'
);

-- Isolation, validation and retained history.
select throws_ok(
  $$select email.request('report.scheduled', 1, 'e1000000-0000-4000-8000-00000000000a',
    'e2000000-0000-4000-8000-000000000003', 'notifications.read',
    '{"accountName":"A","reportName":"R","periodLabel":"P","reportPath":"/reports/1"}', 'report:isolation-1',
    'Report', gen_random_uuid(), null, null, null, null)$$,
  'IC403', null, 'A user of another account is never a recipient'
);
select throws_ok(
  $$select email.request('report.scheduled', 1, 'e1000000-0000-4000-8000-00000000000a',
    'e2000000-0000-4000-8000-000000000001', 'notifications.read',
    '{"accountName":"A","reportName":"R","periodLabel":"P","reportPath":"/reports/1","pdf":"x"}', 'report:vars-1',
    'Report', gen_random_uuid(), null, null, null, null)$$,
  '22023', null, 'Variables outside the template version are rejected'
);
select throws_ok(
  $$delete from email.messages$$, '55000', null, 'Email messages are never deleted'
);
select * from finish();
rollback;
