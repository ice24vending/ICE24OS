-- F5-11: persistent notification center (Database `notification_events`,
-- `notification_recipients`, `notification_delivery_attempts`; API NOT-001 to NOT-006).
-- Alerts are created from domain events (outbox → domain_events → worker consumer) through
-- `notifications.ingest_event`, which resolves recipients by permission and scope. Each
-- recipient owns a state: UNREAD → READ → ACKNOWLEDGED → IN_PROGRESS → RESOLVED. Reading never
-- acknowledges, acknowledging never resolves, and resolving requires the linked condition to be
-- closed (RF-ALT-005 to RF-ALT-007 and RF-ALT-012). Critical alerts stay pinned until
-- acknowledged. Every state change is kept in an append-only history and in central audit.
-- Additive migration: new schema, permissions and rules only.
create schema if not exists notifications;

insert into authz.permissions (code, module_code, action_code, data_classification, description) values
  ('notifications.read', 'notifications', 'READ', 'CONFIDENTIAL', 'Read own notifications of the active account'),
  ('notifications.attend', 'notifications', 'UPDATE', 'CONFIDENTIAL', 'Mark own notifications read, acknowledged, in attention or resolved'),
  ('notifications.billing-alerts', 'notifications', 'RECEIVE', 'CONFIDENTIAL', 'Receive subscription billing alerts'),
  ('notifications.security-alerts', 'notifications', 'RECEIVE', 'RESTRICTED', 'Receive file security alerts');
insert into authz.role_permissions (role_id, permission_id, effect)
select r.id, p.id, 'ALLOW' from authz.roles r cross join authz.permissions p
where (p.code in ('notifications.read', 'notifications.attend') and r.code in ('IA', 'IO', 'OW', 'TC', 'OP', 'SA', 'AU'))
   or (p.code in ('notifications.billing-alerts', 'notifications.security-alerts') and r.code in ('IA', 'OW'));

-- Which domain events become alerts, for whom and with which fixed, safe text. Mirrors
-- NOTIFICATION_EVENT_RULES in @ice24/contracts (pgTAP checks the seed). Payloads are never
-- copied into the message.
create table notifications.event_rules (
  event_type varchar(120) primary key check (event_type ~ '^[A-Z][A-Za-z0-9]+$'),
  notification_type varchar(100) not null unique check (notification_type ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  priority varchar(20) not null check (priority in ('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  title varchar(250) not null check (length(trim(title)) > 0),
  message text not null check (length(trim(message)) > 0),
  recipient_permission varchar(120) not null references authz.permissions(code),
  condition_kind varchar(40) check (condition_kind in ('SUBSCRIPTION_PAYMENT','FILE_PURGE')),
  action_href varchar(200) check (action_href ~ '^/[a-z0-9/_-]*$'),
  action_label varchar(80),
  enabled boolean not null default true,
  check ((action_href is null) = (action_label is null))
);
insert into notifications.event_rules (event_type, notification_type, priority, title, message,
  recipient_permission, condition_kind, action_href, action_label) values
  ('PaymentFailed', 'subscription.payment_failed', 'CRITICAL', 'Pago de suscripción rechazado',
    'El cobro de la suscripción fue rechazado. Actualiza el método de pago para evitar que la cuenta pase a modo solo lectura.',
    'notifications.billing-alerts', 'SUBSCRIPTION_PAYMENT', '/subscription', 'Ver suscripción'),
  ('EnterReadOnly', 'subscription.read_only', 'CRITICAL', 'Cuenta en modo solo lectura',
    'La cuenta pasó a modo solo lectura. Puedes consultar y descargar información, pero no modificar registros hasta regularizar la suscripción.',
    'notifications.billing-alerts', 'SUBSCRIPTION_PAYMENT', '/subscription', 'Ver suscripción'),
  ('FileSecurityAlertRaised', 'files.security_alert', 'HIGH', 'Archivo rechazado por seguridad',
    'Un archivo subido fue rechazado por el análisis antivirus o de integridad y se elimina de la cuarentena. No está disponible para descarga.',
    'notifications.security-alerts', 'FILE_PURGE', '/files', 'Ver archivos');

create table notifications.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type varchar(100) not null,
  origin_event_id uuid not null unique,
  origin_event_type varchar(120) not null references notifications.event_rules(event_type),
  account_id uuid not null references identity.accounts(id),
  branch_id uuid references equipment.branches(id),
  machine_id uuid references equipment.machines(id),
  source_type varchar(60) not null check (length(trim(source_type)) > 0),
  source_id uuid not null,
  priority varchar(20) not null check (priority in ('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  title varchar(250) not null,
  message text not null,
  action_required jsonb check (action_required is null or jsonb_typeof(action_required) = 'object'),
  condition_kind varchar(40) check (condition_kind in ('SUBSCRIPTION_PAYMENT','FILE_PURGE')),
  occurred_at timestamptz not null,
  correlation_id uuid not null,
  created_at timestamptz not null default now()
);
create index notification_events_account on notifications.notification_events (account_id, priority, occurred_at desc);
create index notification_events_machine on notifications.notification_events (machine_id, occurred_at desc);
create index notification_events_source on notifications.notification_events (source_type, source_id);

create table notifications.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  notification_event_id uuid not null references notifications.notification_events(id),
  account_id uuid not null references identity.accounts(id),
  user_id uuid not null references identity.users(id),
  status varchar(30) not null default 'UNREAD'
    check (status in ('UNREAD','READ','ACKNOWLEDGED','IN_PROGRESS','RESOLVED')),
  read_at timestamptz,
  acknowledged_at timestamptz,
  in_progress_at timestamptz,
  resolved_at timestamptz,
  attention_resource jsonb check (attention_resource is null or jsonb_typeof(attention_resource) = 'object'),
  resolution_resource jsonb check (resolution_resource is null or jsonb_typeof(resolution_resource) = 'object'),
  updated_by uuid references identity.users(id),
  row_version integer not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_event_id, user_id),
  check ((status = 'UNREAD') = (read_at is null)),
  check (status in ('UNREAD','READ') or acknowledged_at is not null),
  check (status <> 'IN_PROGRESS' or (in_progress_at is not null and attention_resource is not null)),
  check ((status = 'RESOLVED') = (resolved_at is not null)),
  check (status <> 'RESOLVED' or resolution_resource is not null)
);
create index notification_recipients_user on notifications.notification_recipients (user_id, status, created_at desc);
create index notification_recipients_inbox on notifications.notification_recipients
  (account_id, user_id, created_at desc, id desc);

-- RF-ALT-011: reading, acknowledgement, attention and resolution with actor and time.
create table notifications.recipient_transitions (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references notifications.notification_recipients(id),
  action varchar(20) not null check (action in ('READ','ACKNOWLEDGE','START_ATTENTION','RESOLVE')),
  from_status varchar(30) not null,
  to_status varchar(30) not null,
  actor_user_id uuid not null references identity.users(id),
  context_session_id uuid references identity.context_sessions(id),
  related_resource jsonb check (related_resource is null or jsonb_typeof(related_resource) = 'object'),
  idempotency_key varchar(128) not null check (idempotency_key ~ '^[A-Za-z0-9-]{8,128}$'),
  correlation_id uuid not null,
  occurred_at timestamptz not null default clock_timestamp(),
  unique (recipient_id, idempotency_key)
);
create index recipient_transitions_recipient on notifications.recipient_transitions (recipient_id, occurred_at, id);

-- Channel attempts. F5-11 records the in-app delivery; email (F5-12) and browser push add rows.
create table notifications.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  notification_recipient_id uuid not null references notifications.notification_recipients(id),
  channel varchar(20) not null check (channel in ('IN_APP','BROWSER_PUSH','EMAIL')),
  provider_message_id varchar(255),
  status varchar(20) not null check (status in ('QUEUED','SENT','DELIVERED','FAILED','BOUNCED')),
  attempt_number integer not null default 1 check (attempt_number > 0),
  attempted_at timestamptz not null default now(),
  error_code varchar(80) check (error_code is null or error_code ~ '^[A-Z][A-Z0-9_]{1,79}$')
);
create index notification_delivery_attempts_status on notifications.notification_delivery_attempts (status, attempted_at);
create index notification_delivery_attempts_provider on notifications.notification_delivery_attempts (provider_message_id);
create index notification_delivery_attempts_recipient on notifications.notification_delivery_attempts (notification_recipient_id);

create function notifications.reject_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = '55000', message = 'Notification history is retained';
end $$;
create trigger notification_events_immutable before update or delete or truncate on notifications.notification_events
for each statement execute function notifications.reject_mutation();
create trigger recipient_transitions_immutable before update or delete or truncate on notifications.recipient_transitions
for each statement execute function notifications.reject_mutation();
create trigger notification_recipients_no_delete before delete or truncate on notifications.notification_recipients
for each statement execute function notifications.reject_mutation();

-- Recipient state machine: forward only, identity immutable, version bumped on every change.
create function notifications.guard_recipient() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.id, new.notification_event_id, new.account_id, new.user_id, new.created_at)
     is distinct from (old.id, old.notification_event_id, old.account_id, old.user_id, old.created_at)
     or (old.read_at is not null and new.read_at is distinct from old.read_at)
     or (old.acknowledged_at is not null and new.acknowledged_at is distinct from old.acknowledged_at)
     or (old.in_progress_at is not null and new.in_progress_at is distinct from old.in_progress_at)
     or (old.resolved_at is not null and new.resolved_at is distinct from old.resolved_at) then
    raise exception using errcode = '55000', message = 'Notification recipient facts are immutable';
  end if;
  if new.status is distinct from old.status and not (
       (old.status = 'UNREAD' and new.status in ('READ','ACKNOWLEDGED','IN_PROGRESS'))
    or (old.status = 'READ' and new.status in ('ACKNOWLEDGED','IN_PROGRESS'))
    or (old.status = 'ACKNOWLEDGED' and new.status in ('IN_PROGRESS','RESOLVED'))
    or (old.status = 'IN_PROGRESS' and new.status = 'RESOLVED')
  ) then
    raise exception using errcode = 'IC409', message = format('Invalid notification transition %s -> %s', old.status, new.status);
  end if;
  new.row_version := old.row_version + 1;
  new.updated_at := now();
  return new;
end $$;
create trigger notification_recipients_guard before update on notifications.notification_recipients
for each row execute function notifications.guard_recipient();

-- Effective permission of a membership: an active ALLOW (role or override) and no active DENY.
create function notifications.membership_allows(p_membership_id uuid, p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  with effective as (
    select rp.effect from authz.membership_roles mr
    join authz.roles r on r.id = mr.role_id and r.status = 'ACTIVE'
    join authz.role_permissions rp on rp.role_id = mr.role_id
    join authz.permissions p on p.id = rp.permission_id and p.code = p_permission
    where mr.membership_id = p_membership_id and mr.valid_from <= now()
      and (mr.valid_to is null or mr.valid_to > now())
    union all
    select o.effect from authz.membership_permission_overrides o
    join authz.permissions p on p.id = o.permission_id and p.code = p_permission
    where o.membership_id = p_membership_id and o.valid_from <= now()
      and (o.valid_to is null or o.valid_to > now())
  )
  select coalesce(bool_or(effect = 'ALLOW') and not bool_or(effect = 'DENY'), false) from effective
$$;

-- Active users of the account with the audience permission whose scope covers the event:
-- account-level events need account-wide scope; branch or machine events also reach users
-- scoped to that branch or machine.
create function notifications.recipients_for(
  p_account_id uuid, p_permission text, p_branch_id uuid, p_machine_id uuid
) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct m.user_id from identity.account_memberships m
  join identity.users u on u.id = m.user_id and u.status = 'ACTIVE'
  where m.account_id = p_account_id and m.status = 'ACTIVE' and m.valid_from <= now()
    and (m.valid_to is null or m.valid_to > now())
    and notifications.membership_allows(m.id, p_permission)
    and exists (select 1 from authz.user_scopes s where s.membership_id = m.id
      and s.valid_from <= now() and (s.valid_to is null or s.valid_to > now())
      and (s.scope_type = 'ACCOUNT'
        or (p_branch_id is not null and s.scope_type = 'BRANCH' and s.branch_id = p_branch_id)
        or (p_machine_id is not null and s.scope_type = 'MACHINE' and s.machine_id = p_machine_id)))
$$;

-- Creates the alert for one outbox message (OutboxMessage v1). Idempotent by origin event:
-- a redelivered message creates nothing. Returns the number of recipients created.
create function notifications.ingest_event(p_message jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  rule notifications.event_rules%rowtype;
  target_account uuid;
  source_kind text := left(p_message ->> 'aggregateType', 60);
  source uuid := (p_message ->> 'aggregateId')::uuid;
  branch uuid;
  machine uuid;
  event_id uuid;
  created integer;
begin
  select * into rule from notifications.event_rules r where r.event_type = p_message ->> 'type' and r.enabled;
  if rule.event_type is null then
    return 0;
  end if;
  select a.id into target_account from identity.accounts a where a.id = (p_message ->> 'accountId')::uuid;
  if target_account is null then
    return 0;
  end if;
  -- File alerts inherit the scope of the file's binding (branch or machine).
  if source_kind = 'FileObject' then
    select case b.entity_type when 'BRANCH' then b.entity_id
        when 'MACHINE' then (select mm.branch_id from equipment.machines mm where mm.id = b.entity_id) end,
      case when b.entity_type = 'MACHINE' then b.entity_id end
      into branch, machine
    from files.file_bindings b where b.file_object_id = source order by b.created_at limit 1;
  end if;
  insert into notifications.notification_events (event_type, origin_event_id, origin_event_type,
    account_id, branch_id, machine_id, source_type, source_id, priority, title, message,
    action_required, condition_kind, occurred_at, correlation_id)
  values (rule.notification_type, (p_message ->> 'eventId')::uuid, rule.event_type, target_account,
    branch, machine, source_kind, source, rule.priority, rule.title, rule.message,
    case when rule.action_href is not null
      then jsonb_build_object('href', rule.action_href, 'label', rule.action_label) end,
    rule.condition_kind, coalesce((p_message ->> 'occurredAt')::timestamptz, now()),
    coalesce((p_message ->> 'correlationId')::uuid, gen_random_uuid()))
  on conflict (origin_event_id) do nothing
  returning id into event_id;
  if event_id is null then
    return 0; -- duplicate delivery
  end if;
  with recipients as (
    insert into notifications.notification_recipients (notification_event_id, account_id, user_id)
    select event_id, target_account, r.user_id
    from notifications.recipients_for(target_account, rule.recipient_permission, branch, machine) r(user_id)
    returning id
  )
  insert into notifications.notification_delivery_attempts (notification_recipient_id, channel, status)
  select id, 'IN_APP', 'DELIVERED' from recipients;
  get diagnostics created = row_count;
  insert into audit.events (event_version, occurred_at_utc, time_zone, actor_user_id, actor_type,
    context_session_id, account_id, branch_id, machine_id, entity_type, entity_id, operation,
    previous_values, new_values, reason, origin, result, correlation_id)
  values (1, now(), 'UTC', null, 'SYSTEM', null, target_account, branch, machine,
    'NotificationEvent', event_id, 'NotificationCreated', null,
    jsonb_build_object('type', rule.notification_type, 'priority', rule.priority,
      'originEventId', p_message ->> 'eventId', 'originEventType', rule.event_type,
      'sourceType', source_kind, 'sourceId', source, 'recipients', created),
    case when created = 0 then 'No active recipient with the audience permission and scope' end,
    'WORKER', 'SUCCESS', coalesce((p_message ->> 'correlationId')::uuid, gen_random_uuid()));
  return created;
end $$;

-- True while the condition behind an alert is still open, so it cannot be resolved yet.
create function notifications.condition_open(p_event_id uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  event notifications.notification_events%rowtype;
begin
  select * into event from notifications.notification_events e where e.id = p_event_id;
  if event.id is null or event.condition_kind is null then
    return false;
  end if;
  if event.condition_kind = 'SUBSCRIPTION_PAYMENT' then
    return exists (select 1 from subscriptions.records s where s.id = event.source_id
      and s.account_id = event.account_id and s.status in ('payment_failed','read_only'));
  end if;
  if event.condition_kind = 'FILE_PURGE' then
    return exists (select 1 from files.file_versions v where v.file_object_id = event.source_id
      and v.storage_zone = 'QUARANTINE' and v.scan_status in ('INFECTED','FAILED') and v.purged_at is null);
  end if;
  return true; -- unknown condition kinds fail closed
end $$;

-- A resource referenced by attention or resolution must exist in the same account.
create function notifications.resource_in_account(p_account_id uuid, p_type text, p_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select case p_type
    when 'subscription' then exists (select 1 from subscriptions.records s where s.id = p_id and s.account_id = p_account_id)
    when 'file' then exists (select 1 from files.file_objects f where f.id = p_id and f.account_id = p_account_id)
    when 'job' then exists (select 1 from infra.async_jobs j where j.id = p_id and j.account_id = p_account_id)
    when 'branch' then exists (select 1 from equipment.branches b where b.id = p_id and b.account_id = p_account_id)
    when 'machine' then exists (select 1 from equipment.machines m where m.id = p_id and m.account_id = p_account_id)
    else false
  end
$$;

-- NOT-003 to NOT-006 for the recipient's own notification in the active account.
-- Errors: IC404 not found, IC412 idempotency key reused for another action, IC409 invalid
-- transition, IC428 linked condition still open (RELATED_CONDITION_NOT_RESOLVED), 22023 invalid
-- related resource. Repeating READ or ACKNOWLEDGE on a state already reached is a no-op.
create function notifications.transition(
  p_recipient_id uuid, p_account_id uuid, p_actor_user_id uuid, p_context_session_id uuid,
  p_action text, p_resource jsonb, p_idempotency_key text, p_correlation_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  recipient notifications.notification_recipients%rowtype;
  previous_action text;
  target text;
  resource jsonb;
  zone text;
  session_id uuid := p_context_session_id;
begin
  if p_action not in ('READ','ACKNOWLEDGE','START_ATTENTION','RESOLVE') then
    raise exception using errcode = '22023', message = 'Unknown notification action';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9-]{8,128}$' then
    raise exception using errcode = '22023', message = 'Invalid idempotency key';
  end if;
  select * into recipient from notifications.notification_recipients r
    where r.id = p_recipient_id and r.account_id = p_account_id and r.user_id = p_actor_user_id
    for update;
  if recipient.id is null then
    raise exception using errcode = 'IC404', message = 'Notification not found';
  end if;
  select t.action into previous_action from notifications.recipient_transitions t
    where t.recipient_id = recipient.id and t.idempotency_key = p_idempotency_key;
  if previous_action is not null then
    if previous_action <> p_action then
      raise exception using errcode = 'IC412', message = 'Idempotency key reused for another action';
    end if;
    return recipient.id;
  end if;
  if p_action in ('START_ATTENTION','RESOLVE') then
    if p_resource is null or jsonb_typeof(p_resource) <> 'object'
       or (p_resource ->> 'type') is null or (p_resource ->> 'id') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       or not notifications.resource_in_account(p_account_id, p_resource ->> 'type', (p_resource ->> 'id')::uuid) then
      raise exception using errcode = '22023', message = 'Related resource not found in the account';
    end if;
    resource := jsonb_build_object('type', p_resource ->> 'type', 'id', lower(p_resource ->> 'id'));
  end if;
  target := case p_action
    when 'READ' then case when recipient.status = 'UNREAD' then 'READ' end
    when 'ACKNOWLEDGE' then case when recipient.status in ('UNREAD','READ') then 'ACKNOWLEDGED'
      when recipient.status = 'ACKNOWLEDGED' then null else 'INVALID' end
    when 'START_ATTENTION' then case when recipient.status in ('UNREAD','READ','ACKNOWLEDGED')
      then 'IN_PROGRESS' else 'INVALID' end
    when 'RESOLVE' then case when recipient.status in ('ACKNOWLEDGED','IN_PROGRESS')
      then 'RESOLVED' else 'INVALID' end
  end;
  if target is null then
    return recipient.id; -- already read or acknowledged: nothing to record
  end if;
  if target = 'INVALID' then
    raise exception using errcode = 'IC409',
      message = format('Cannot %s a notification in status %s', lower(p_action), recipient.status);
  end if;
  if target = 'RESOLVED' and notifications.condition_open(recipient.notification_event_id) then
    raise exception using errcode = 'IC428', message = 'The related condition is still open';
  end if;
  update notifications.notification_recipients r set status = target,
    read_at = coalesce(r.read_at, now()),
    acknowledged_at = case when target in ('ACKNOWLEDGED','IN_PROGRESS','RESOLVED')
      then coalesce(r.acknowledged_at, now()) else r.acknowledged_at end,
    in_progress_at = case when target = 'IN_PROGRESS' then now() else r.in_progress_at end,
    resolved_at = case when target = 'RESOLVED' then now() else r.resolved_at end,
    attention_resource = case when target = 'IN_PROGRESS' then resource else r.attention_resource end,
    resolution_resource = case when target = 'RESOLVED' then resource else r.resolution_resource end,
    updated_by = p_actor_user_id
  where r.id = recipient.id;
  if session_id is not null and not exists (select 1 from identity.context_sessions c
      where c.id = session_id and c.user_id = p_actor_user_id) then
    session_id := null;
  end if;
  insert into notifications.recipient_transitions (recipient_id, action, from_status, to_status,
    actor_user_id, context_session_id, related_resource, idempotency_key, correlation_id)
  values (recipient.id, p_action, recipient.status, target, p_actor_user_id, session_id, resource,
    p_idempotency_key, coalesce(p_correlation_id, gen_random_uuid()));
  select u.time_zone into zone from identity.users u where u.id = p_actor_user_id;
  insert into audit.events (event_version, occurred_at_utc, time_zone, actor_user_id, actor_type,
    context_session_id, account_id, entity_type, entity_id, operation, previous_values, new_values,
    reason, origin, result, correlation_id)
  values (1, now(), coalesce(zone, 'UTC'), p_actor_user_id, 'USER', session_id, p_account_id,
    'Notification', recipient.id,
    case p_action when 'READ' then 'NotificationRead' when 'ACKNOWLEDGE' then 'NotificationAcknowledged'
      when 'START_ATTENTION' then 'NotificationAttentionStarted' else 'NotificationResolved' end,
    jsonb_build_object('status', recipient.status),
    jsonb_build_object('status', target, 'notificationEventId', recipient.notification_event_id)
      || case when resource is not null then jsonb_build_object('relatedResource', resource) else '{}'::jsonb end,
    null, 'API', 'SUCCESS', coalesce(p_correlation_id, gen_random_uuid()));
  return recipient.id;
end $$;

alter table notifications.event_rules enable row level security;
alter table notifications.notification_events enable row level security;
alter table notifications.notification_recipients enable row level security;
alter table notifications.recipient_transitions enable row level security;
alter table notifications.notification_delivery_attempts enable row level security;
revoke all on schema notifications from public, anon, authenticated;
revoke all on all tables in schema notifications from public, anon, authenticated, service_role;
revoke all on all functions in schema notifications from public, anon, authenticated, service_role;
grant usage on schema notifications to service_role;
-- The runtime reads; every change goes through ingest_event or transition.
grant select on notifications.event_rules, notifications.notification_events,
  notifications.notification_recipients, notifications.recipient_transitions,
  notifications.notification_delivery_attempts to service_role;
grant execute on function notifications.ingest_event(jsonb),
  notifications.condition_open(uuid),
  notifications.transition(uuid, uuid, uuid, uuid, text, jsonb, text, uuid)
  to service_role;
