begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(41);

-- Structure, privileges and catalog.
select has_table('notifications', 'notification_events', 'Notification events persist');
select has_table('notifications', 'notification_recipients', 'Per-recipient alert state persists');
select has_table('notifications', 'recipient_transitions', 'Alert state history persists');
select has_table('notifications', 'notification_delivery_attempts', 'Delivery attempts persist');
select ok(
  (select bool_and(relrowsecurity) from pg_class where relnamespace = 'notifications'::regnamespace and relkind = 'r'),
  'Every notifications table has RLS'
);
select ok(
  has_function_privilege('service_role', 'notifications.ingest_event(jsonb)', 'EXECUTE')
  and has_function_privilege('service_role', 'notifications.transition(uuid, uuid, uuid, uuid, text, jsonb, text, uuid)', 'EXECUTE')
  and not has_function_privilege('service_role', 'notifications.recipients_for(uuid, text, uuid, uuid)', 'EXECUTE')
  and not has_table_privilege('service_role', 'notifications.notification_recipients', 'UPDATE')
  and not has_table_privilege('service_role', 'notifications.notification_events', 'INSERT')
  and not has_schema_privilege('authenticated', 'notifications', 'USAGE')
  and not has_schema_privilege('anon', 'notifications', 'USAGE'),
  'The runtime reads and calls functions only; browsers have no access'
);
select results_eq(
  $$select string_agg(event_type || ':' || notification_type || ':' || priority, ',' order by event_type)
    from notifications.event_rules$$,
  $$values ('EnterReadOnly:subscription.read_only:CRITICAL,FileSecurityAlertRaised:files.security_alert:HIGH,PaymentFailed:subscription.payment_failed:CRITICAL'::text)$$,
  'Alert rules mirror NOTIFICATION_EVENT_RULES'
);
select is(
  (select count(*)::integer from authz.permissions where module_code = 'notifications'), 4,
  'Notification permissions are seeded'
);

-- Fixtures: account A with an owner, a denied owner, a branch operator with the security
-- audience, an operator of another branch; account B with its own owner.
insert into identity.accounts (id, name, account_type) values
  ('a1000000-0000-4000-8000-00000000000a', 'Alerts A', 'COMPANY'),
  ('a1000000-0000-4000-8000-00000000000b', 'Alerts B', 'COMPANY');
insert into identity.users (id, identity_subject, username, email, display_name, status) values
  ('a2000000-0000-4000-8000-000000000001', 'alerts-owner', 'alerts-owner', 'alerts-owner@example.test', 'Owner', 'ACTIVE'),
  ('a2000000-0000-4000-8000-000000000002', 'alerts-denied', 'alerts-denied', 'alerts-denied@example.test', 'Denied', 'ACTIVE'),
  ('a2000000-0000-4000-8000-000000000003', 'alerts-branch', 'alerts-branch', 'alerts-branch@example.test', 'Branch', 'ACTIVE'),
  ('a2000000-0000-4000-8000-000000000004', 'alerts-other-branch', 'alerts-other-branch', 'alerts-ob@example.test', 'Other branch', 'ACTIVE'),
  ('a2000000-0000-4000-8000-000000000005', 'alerts-owner-b', 'alerts-owner-b', 'alerts-owner-b@example.test', 'Owner B', 'ACTIVE');
insert into equipment.branches (id, account_id, data) values
  ('a3000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', '{}'),
  ('a3000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', '{}');
insert into identity.account_memberships (id, account_id, user_id, status) values
  ('a4000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000001', 'ACTIVE'),
  ('a4000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000002', 'ACTIVE'),
  ('a4000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000003', 'ACTIVE'),
  ('a4000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000004', 'ACTIVE'),
  ('a4000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-00000000000b', 'a2000000-0000-4000-8000-000000000005', 'ACTIVE');
insert into authz.membership_roles (membership_id, role_id)
select m.id, r.id from (values
  ('a4000000-0000-4000-8000-000000000001'::uuid, 'OW'), ('a4000000-0000-4000-8000-000000000002'::uuid, 'OW'),
  ('a4000000-0000-4000-8000-000000000003'::uuid, 'OP'), ('a4000000-0000-4000-8000-000000000004'::uuid, 'OP'),
  ('a4000000-0000-4000-8000-000000000005'::uuid, 'OW')) m(id, code)
join authz.roles r on r.code = m.code;
insert into authz.user_scopes (membership_id, scope_type, branch_id) values
  ('a4000000-0000-4000-8000-000000000001', 'ACCOUNT', null),
  ('a4000000-0000-4000-8000-000000000002', 'ACCOUNT', null),
  ('a4000000-0000-4000-8000-000000000003', 'BRANCH', 'a3000000-0000-4000-8000-000000000001'),
  ('a4000000-0000-4000-8000-000000000004', 'BRANCH', 'a3000000-0000-4000-8000-000000000002'),
  ('a4000000-0000-4000-8000-000000000005', 'ACCOUNT', null);
insert into authz.membership_permission_overrides (membership_id, permission_id, effect, reason)
select m.id, p.id, m.effect, 'Synthetic override for alert audience tests' from (values
  ('a4000000-0000-4000-8000-000000000002'::uuid, 'DENY'), ('a4000000-0000-4000-8000-000000000003'::uuid, 'ALLOW'),
  ('a4000000-0000-4000-8000-000000000004'::uuid, 'ALLOW')) m(id, effect)
join authz.permissions p on p.code = 'notifications.security-alerts';
insert into identity.context_sessions (id, user_id, account_id, membership_id) values
  ('a5000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001');
insert into subscriptions.records (id, account_id, provider_customer_id, provider_subscription_id, status,
  current_period_start, current_period_end, is_demo, created_by, updated_by) values
  ('a6000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'cus_alerts_a', 'sub_alerts_a',
   'payment_failed', now() - interval '20 days', now() + interval '10 days', false,
   'a2000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001');

-- Real producer → outbox → ingest (the worker consumer calls ingest_event with this message).
insert into subscriptions.events (id, subscription_id, account_id, actor_id, context_id, correlation_id,
  event_type, reason, previous_state, new_state, actor_type)
values ('a7000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000001',
  'a5000000-0000-4000-8000-000000000001', 'a8000000-0000-4000-8000-000000000001', 'payment_failed',
  'Stripe reported a failed renewal charge', '{"status":"active"}', '{"status":"payment_failed"}', 'USER');
select is(
  (select event_type::text from infra.outbox_events where id = 'a7000000-0000-4000-8000-000000000001'),
  'PaymentFailed', 'The subscription producer publishes PaymentFailed to the outbox'
);
create temp table outbox_message on commit drop as
  select infra.outbox_message(o) as message from infra.outbox_events o where o.id = 'a7000000-0000-4000-8000-000000000001';
select is(
  notifications.ingest_event((select message from outbox_message)), 2,
  'Billing alerts reach the account-wide owners with the audience permission'
);
select is(
  notifications.ingest_event((select message from outbox_message)), 0,
  'A redelivered event creates no duplicate alert'
);
select is(
  notifications.ingest_event((select message || '{"type":"LoginFailed","eventId":"a7000000-0000-4000-8000-0000000000ff"}' from outbox_message)),
  0, 'Events without an alert rule are ignored'
);
create temp table billing on commit drop as
  select r.id, r.user_id from notifications.notification_recipients r
  join notifications.notification_events e on e.id = r.notification_event_id
  where e.origin_event_id = 'a7000000-0000-4000-8000-000000000001';
select results_eq(
  $$select r.user_id::text, r.status::text, e.priority::text, e.event_type::text, e.source_type::text,
      e.correlation_id::text, a.channel::text, a.status::text
    from notifications.notification_recipients r
    join notifications.notification_events e on e.id = r.notification_event_id
    join notifications.notification_delivery_attempts a on a.notification_recipient_id = r.id
    where e.origin_event_id = 'a7000000-0000-4000-8000-000000000001' order by r.user_id$$,
  $$values ('a2000000-0000-4000-8000-000000000001'::text, 'UNREAD'::text, 'CRITICAL'::text,
      'subscription.payment_failed'::text, 'Subscription'::text, 'a8000000-0000-4000-8000-000000000001'::text,
      'IN_APP'::text, 'DELIVERED'::text),
    ('a2000000-0000-4000-8000-000000000002', 'UNREAD', 'CRITICAL', 'subscription.payment_failed',
      'Subscription', 'a8000000-0000-4000-8000-000000000001', 'IN_APP', 'DELIVERED')$$,
  'Each recipient gets an unread critical alert delivered in-app, with the producer correlation'
);
select results_eq(
  $$select actor_type, origin::text, operation::text, (new_values ->> 'recipients')::integer
    from audit.events where entity_type = 'NotificationEvent' and account_id = 'a1000000-0000-4000-8000-00000000000a'$$,
  $$values ('SYSTEM'::text, 'WORKER'::text, 'NotificationCreated'::text, 2)$$,
  'Alert creation is centrally audited once'
);

-- Isolation: other users and other accounts cannot see or change the owner's alert.
select throws_ok(
  $$select notifications.transition((select id from billing where user_id = 'a2000000-0000-4000-8000-000000000001'),
    'a1000000-0000-4000-8000-00000000000b', 'a2000000-0000-4000-8000-000000000005', null, 'READ', null, 'iso-key-0001', null)$$,
  'IC404', null, 'Another account cannot change the alert'
);
select throws_ok(
  $$select notifications.transition((select id from billing where user_id = 'a2000000-0000-4000-8000-000000000001'),
    'a1000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000002', null, 'READ', null, 'iso-key-0002', null)$$,
  'IC404', null, 'Another recipient of the same account cannot change the alert'
);

-- Lifecycle of the owner's alert.
create function pg_temp.owner_alert() returns uuid language sql as
  $$ select id from billing where user_id = 'a2000000-0000-4000-8000-000000000001' $$;
create function pg_temp.act(p_action text, p_key text, p_resource jsonb default null) returns uuid language sql as
  $$ select notifications.transition(pg_temp.owner_alert(), 'a1000000-0000-4000-8000-00000000000a',
       'a2000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', p_action, p_resource,
       p_key, 'a8000000-0000-4000-8000-000000000002') $$;
select lives_ok($$select pg_temp.act('READ', 'read-key-0001')$$, 'The recipient marks the alert read');
select results_eq(
  $$select status::text, read_at is not null, acknowledged_at is null from notifications.notification_recipients
    where id = pg_temp.owner_alert()$$,
  $$values ('READ'::text, true, true)$$,
  'Reading does not acknowledge (RF-ALT-006): the critical alert stays pinned'
);
select lives_ok($$select pg_temp.act('READ', 'read-key-0002')$$, 'Reading again is a harmless no-op');
select throws_ok($$select pg_temp.act('RESOLVE', 'resolve-key-0001',
    '{"type":"subscription","id":"a6000000-0000-4000-8000-000000000001"}')$$,
  'IC409', null, 'An alert must be acknowledged before it can be resolved');
select lives_ok($$select pg_temp.act('ACKNOWLEDGE', 'ack-key-0001')$$, 'The recipient acknowledges');
select results_eq(
  $$select status::text, acknowledged_at is not null, resolved_at is null from notifications.notification_recipients
    where id = pg_temp.owner_alert()$$,
  $$values ('ACKNOWLEDGED'::text, true, true)$$,
  'Acknowledging does not resolve the condition (RF-ALT-007)'
);
select throws_ok($$select pg_temp.act('READ', 'ack-key-0001')$$, 'IC412', null,
  'An idempotency key cannot be reused for another action');
select lives_ok($$select pg_temp.act('ACKNOWLEDGE', 'ack-key-0001')$$, 'Replaying the same request is accepted');
select throws_ok($$select pg_temp.act('START_ATTENTION', 'attend-key-0001',
    '{"type":"subscription","id":"a6000000-0000-4000-8000-0000000000ff"}')$$,
  '22023', null, 'Attention must link a resource of the same account');
select throws_ok($$select pg_temp.act('START_ATTENTION', 'attend-key-0002',
    '{"type":"ticket","id":"a6000000-0000-4000-8000-000000000001"}')$$,
  '22023', null, 'Only supported resource types can be linked');
select lives_ok($$select pg_temp.act('START_ATTENTION', 'attend-key-0003',
    '{"type":"subscription","id":"A6000000-0000-4000-8000-000000000001"}')$$,
  'Attention links the subscription');
select is(
  (select attention_resource from notifications.notification_recipients where id = pg_temp.owner_alert()),
  '{"type":"subscription","id":"a6000000-0000-4000-8000-000000000001"}'::jsonb,
  'The linked resource is stored normalized'
);
select throws_ok($$select pg_temp.act('RESOLVE', 'resolve-key-0002',
    '{"type":"subscription","id":"a6000000-0000-4000-8000-000000000001"}')$$,
  'IC428', null, 'The alert cannot be resolved while the payment is still failed (RELATED_CONDITION_NOT_RESOLVED)');
update subscriptions.records set status = 'active', row_version = row_version + 1
  where id = 'a6000000-0000-4000-8000-000000000001';
select lives_ok($$select pg_temp.act('RESOLVE', 'resolve-key-0003',
    '{"type":"subscription","id":"a6000000-0000-4000-8000-000000000001"}')$$,
  'Once the payment recovers the alert is resolved with its resolution resource (RF-ALT-012)');
select throws_ok($$select pg_temp.act('ACKNOWLEDGE', 'ack-key-0009')$$, 'IC409', null,
  'A resolved alert cannot move back');
select results_eq(
  $$select string_agg(action || ':' || from_status || '>' || to_status, ',' order by occurred_at, id)
    from notifications.recipient_transitions where recipient_id = pg_temp.owner_alert()$$,
  $$values ('READ:UNREAD>READ,ACKNOWLEDGE:READ>ACKNOWLEDGED,START_ATTENTION:ACKNOWLEDGED>IN_PROGRESS,RESOLVE:IN_PROGRESS>RESOLVED'::text)$$,
  'Reading, acknowledgement, attention and resolution are recorded once each (RF-ALT-011)'
);
select results_eq(
  $$select operation::text, actor_user_id::text, context_session_id::text, origin::text from audit.events
    where entity_type = 'Notification' and entity_id = pg_temp.owner_alert() order by operation$$,
  $$values ('NotificationAcknowledged'::text, 'a2000000-0000-4000-8000-000000000001'::text, 'a5000000-0000-4000-8000-000000000001'::text, 'API'::text),
    ('NotificationAttentionStarted', 'a2000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'API'),
    ('NotificationRead', 'a2000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'API'),
    ('NotificationResolved', 'a2000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'API')$$,
  'Every state change is in the central audit with actor and context'
);
select throws_ok(
  $$update notifications.notification_recipients set status = 'READ' where id = (select id from billing where user_id = 'a2000000-0000-4000-8000-000000000002')$$,
  '23514', null, 'State and its timestamps move together; direct shortcuts are rejected'
);
select throws_ok(
  $$update notifications.notification_recipients set user_id = 'a2000000-0000-4000-8000-000000000005' where id = pg_temp.owner_alert()$$,
  '55000', null, 'The recipient of an alert is immutable'
);
select throws_ok($$delete from notifications.notification_events$$, '55000', null, 'Alert events are retained');
select throws_ok($$delete from notifications.recipient_transitions$$, '55000', null, 'Alert history is append-only');

-- File security alert: scope of the binding, DENY overrides and the purge condition.
insert into files.file_objects (id, account_id, category, purpose, status, sensitivity, created_by) values
  ('a9000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'PDF', 'equipment_evidence',
   'PENDING_UPLOAD', 'INTERNAL', 'a2000000-0000-4000-8000-000000000003');
insert into files.file_bindings (file_object_id, entity_type, entity_id) values
  ('a9000000-0000-4000-8000-000000000001', 'BRANCH', 'a3000000-0000-4000-8000-000000000001');
insert into files.file_versions (id, file_object_id, version_number, storage_zone, object_key, original_filename,
  media_type, size_bytes, scan_status, sha256, scan_details) values
  ('a9100000-0000-4000-8000-000000000001', 'a9000000-0000-4000-8000-000000000001', 1, 'QUARANTINE',
   'a1000000-0000-4000-8000-00000000000a/a9000000-0000-4000-8000-000000000001/v1/a9200000-0000-4000-8000-000000000001',
   'factura.pdf', 'application/pdf', 1024, 'INFECTED', repeat('e', 64), '{"verdict":"INFECTED"}');
select is(
  notifications.ingest_event(jsonb_build_object('messageVersion', 1, 'eventId', 'a7000000-0000-4000-8000-000000000002',
    'type', 'FileSecurityAlertRaised', 'aggregateType', 'FileObject', 'aggregateId', 'a9000000-0000-4000-8000-000000000001',
    'accountId', 'a1000000-0000-4000-8000-00000000000a', 'correlationId', 'a8000000-0000-4000-8000-000000000003',
    'occurredAt', '2026-10-03T12:00:00.000000Z', 'payload', '{}'::jsonb)),
  2, 'File security alerts reach the account-wide owner and the user scoped to the file branch'
);
select results_eq(
  $$select r.user_id::text, e.branch_id::text from notifications.notification_recipients r
    join notifications.notification_events e on e.id = r.notification_event_id
    where e.origin_event_id = 'a7000000-0000-4000-8000-000000000002' order by r.user_id$$,
  $$values ('a2000000-0000-4000-8000-000000000001'::text, 'a3000000-0000-4000-8000-000000000001'::text),
    ('a2000000-0000-4000-8000-000000000003', 'a3000000-0000-4000-8000-000000000001')$$,
  'A DENY override and another branch scope exclude recipients'
);
select ok(
  notifications.condition_open((select id from notifications.notification_events where origin_event_id = 'a7000000-0000-4000-8000-000000000002')),
  'The security alert stays open while the infected bytes are not purged'
);
update files.file_versions set purged_at = now() where id = 'a9100000-0000-4000-8000-000000000001';
select ok(
  not notifications.condition_open((select id from notifications.notification_events where origin_event_id = 'a7000000-0000-4000-8000-000000000002')),
  'The purge closes the security condition'
);
select * from finish();
rollback;
