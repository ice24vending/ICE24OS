-- F5-12: transactional email with versioned templates and technical delivery tracking
-- (PRD RF-INT-002, RF-ALT-003, RF-ALT-008, RF-RPT-004; TRD 17 and 30).
-- Flow: a producer asks for a message with `email.request` (critical alerts do it through the
-- `email-alerts` domain-event consumer and `email.enqueue_alert`). The message, its EMAIL job and
-- the `email_deliveries` queue message commit together. The worker renders the template server
-- side, sends through the provider adapter with the message id as idempotency key and records
-- SENT; provider webhooks move it to DELIVERED or BOUNCED. Retries use the queue policy backoff;
-- exhausted messages go to `email_deliveries_dlq` and stay FAILED until support re-queues the job
-- (INT-004). No recipient address, token or source payload is stored here: the address is
-- resolved from `identity.users` at send time and only its SHA-256 is kept.
-- Additive migration: new schema, queue and functions; existing tables are only read.
create schema if not exists email;

-- Template catalog. Mirrors EMAIL_TEMPLATES in @ice24/contracts (integration test checks it).
-- The content lives in the worker; this table pins which versions exist and their variables.
create table email.templates (
  template_key varchar(80) not null check (template_key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  version integer not null check (version > 0),
  message_type varchar(40) not null check (message_type in ('CRITICAL_ALERT','SCHEDULED_REPORT')),
  variables text[] not null check (cardinality(variables) > 0),
  status varchar(20) not null default 'ACTIVE' check (status in ('ACTIVE','RETIRED')),
  created_at timestamptz not null default now(),
  primary key (template_key, version)
);
insert into email.templates (template_key, version, message_type, variables) values
  ('alert.critical', 1, 'CRITICAL_ALERT',
    array['accountName','actionLabel','actionPath','message','occurredAt','title']),
  ('report.scheduled', 1, 'SCHEDULED_REPORT',
    array['accountName','periodLabel','reportName','reportPath']);

create table email.messages (
  id uuid primary key default gen_random_uuid(),
  idempotency_key varchar(200) not null unique check (length(idempotency_key) between 8 and 200),
  message_type varchar(40) not null check (message_type in ('CRITICAL_ALERT','SCHEDULED_REPORT')),
  template_key varchar(80) not null,
  template_version integer not null,
  account_id uuid not null references identity.accounts(id),
  recipient_user_id uuid not null references identity.users(id),
  -- Revalidated before every attempt: membership, user status and this permission.
  recipient_permission varchar(120) not null references authz.permissions(code),
  notification_recipient_id uuid references notifications.notification_recipients(id),
  source_type varchar(60) not null check (length(trim(source_type)) > 0),
  source_id uuid not null,
  origin_event_id uuid,
  origin_event_type varchar(120),
  variables jsonb not null check (jsonb_typeof(variables) = 'object'),
  status varchar(20) not null default 'QUEUED'
    check (status in ('QUEUED','SENT','DELIVERED','BOUNCED','FAILED')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code varchar(80) check (last_error_code is null or last_error_code ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  provider varchar(40) check (provider is null or provider ~ '^[a-z][a-z0-9-]{1,39}$'),
  provider_message_id varchar(255),
  recipient_address_sha256 char(64) check (recipient_address_sha256 is null or recipient_address_sha256 ~ '^[0-9a-f]{64}$'),
  job_id uuid references infra.async_jobs(id),
  correlation_id uuid not null,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  bounced_at timestamptz,
  failed_at timestamptz,
  row_version integer not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (template_key, template_version) references email.templates (template_key, version),
  unique (provider, provider_message_id),
  check ((status in ('SENT','DELIVERED','BOUNCED')) = (sent_at is not null)),
  check (sent_at is null or (provider is not null and provider_message_id is not null
    and recipient_address_sha256 is not null)),
  check (status <> 'DELIVERED' or delivered_at is not null),
  check (status <> 'BOUNCED' or bounced_at is not null),
  check (status <> 'FAILED' or failed_at is not null)
);
create index email_messages_account on email.messages (account_id, created_at desc, id desc);
create index email_messages_status on email.messages (status, updated_at);
create index email_messages_notification on email.messages (notification_recipient_id, created_at desc)
  where notification_recipient_id is not null;
create index email_messages_origin on email.messages (origin_event_id) where origin_event_id is not null;
create index email_messages_correlation on email.messages (correlation_id);

-- Append-only delivery history: one row per state change or failed attempt.
create table email.message_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references email.messages(id),
  event_type varchar(30) not null check (event_type in ('QUEUED','ATTEMPT_FAILED','SENT',
    'DELIVERED','BOUNCED','FAILED','REQUEUED','RECIPIENT_REJECTED')),
  from_status varchar(20),
  to_status varchar(20) not null,
  attempt integer not null default 0 check (attempt >= 0),
  error_code varchar(80),
  provider_event_id varchar(255),
  correlation_id uuid,
  occurred_at timestamptz not null default clock_timestamp()
);
create index email_message_events_message on email.message_events (message_id, occurred_at, id);

-- Provider tracking events (delivery and bounce only), stored before they are applied so they
-- are idempotent by (provider, event id) and can arrive before the send is recorded.
create table email.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider varchar(40) not null check (provider ~ '^[a-z][a-z0-9-]{1,39}$'),
  provider_event_id varchar(255) not null,
  event_type varchar(20) not null check (event_type in ('DELIVERED','BOUNCED')),
  provider_message_id varchar(255) not null,
  occurred_at timestamptz not null,
  payload_sha256 char(64) not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  outcome varchar(20) not null default 'PENDING' check (outcome in ('PENDING','APPLIED','IGNORED')),
  message_id uuid references email.messages(id),
  correlation_id uuid not null,
  received_at timestamptz not null default now(),
  applied_at timestamptz,
  unique (provider, provider_event_id),
  check ((outcome = 'PENDING') = (applied_at is null))
);
create index email_provider_events_pending on email.provider_events (provider, provider_message_id)
  where outcome = 'PENDING';

create function email.reject_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = '55000', message = 'Email history is retained';
end $$;
create trigger message_events_immutable before update or delete or truncate on email.message_events
for each statement execute function email.reject_mutation();
create trigger messages_no_delete before delete or truncate on email.messages
for each statement execute function email.reject_mutation();
create trigger provider_events_no_delete before delete or truncate on email.provider_events
for each statement execute function email.reject_mutation();
create trigger templates_no_delete before delete or truncate on email.templates
for each statement execute function email.reject_mutation();

-- Message facts are immutable; status only follows the delivery state machine.
create function email.guard_message() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.id, new.idempotency_key, new.message_type, new.template_key, new.template_version,
      new.account_id, new.recipient_user_id, new.recipient_permission, new.notification_recipient_id,
      new.source_type, new.source_id, new.origin_event_id, new.origin_event_type, new.variables,
      new.correlation_id, new.queued_at, new.created_at)
     is distinct from (old.id, old.idempotency_key, old.message_type, old.template_key,
      old.template_version, old.account_id, old.recipient_user_id, old.recipient_permission,
      old.notification_recipient_id, old.source_type, old.source_id, old.origin_event_id,
      old.origin_event_type, old.variables, old.correlation_id, old.queued_at, old.created_at)
     or (old.job_id is not null and new.job_id is distinct from old.job_id)
     or (old.sent_at is not null and (new.sent_at, new.provider, new.provider_message_id,
       new.recipient_address_sha256) is distinct from (old.sent_at, old.provider,
       old.provider_message_id, old.recipient_address_sha256))
     or (old.delivered_at is not null and new.delivered_at is distinct from old.delivered_at)
     or (old.bounced_at is not null and new.bounced_at is distinct from old.bounced_at)
     or new.attempt_count < old.attempt_count then
    raise exception using errcode = '55000', message = 'Email message facts are immutable';
  end if;
  if new.status is distinct from old.status and not (
       (old.status = 'QUEUED' and new.status in ('SENT','FAILED'))
    or (old.status = 'FAILED' and new.status = 'QUEUED')
    or (old.status = 'SENT' and new.status in ('DELIVERED','BOUNCED'))
    or (old.status = 'DELIVERED' and new.status = 'BOUNCED')
  ) then
    raise exception using errcode = 'IC409', message = format('Invalid email transition %s -> %s', old.status, new.status);
  end if;
  new.row_version := old.row_version + 1;
  new.updated_at := now();
  return new;
end $$;
create trigger messages_guard before update on email.messages
for each row execute function email.guard_message();

-- A pending provider event is applied once; its facts never change.
create function email.guard_provider_event() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - array['outcome','message_id','applied_at'])
       is distinct from (to_jsonb(old) - array['outcome','message_id','applied_at'])
     or old.outcome <> 'PENDING' then
    raise exception using errcode = '55000', message = 'Provider events are immutable once applied';
  end if;
  return new;
end $$;
create trigger provider_events_guard before update on email.provider_events
for each row execute function email.guard_provider_event();

create function email.write_audit(
  p_account uuid, p_message uuid, p_operation text, p_previous jsonb, p_new jsonb,
  p_reason text, p_result text, p_origin text, p_correlation uuid
) returns void
language sql security definer set search_path = '' as $$
  insert into audit.events (event_version, occurred_at_utc, time_zone, actor_user_id, actor_type,
    context_session_id, account_id, entity_type, entity_id, operation, previous_values, new_values,
    reason, origin, result, correlation_id)
  values (1, now(), 'UTC', null, 'SYSTEM', null, p_account, 'EmailMessage', p_message, p_operation,
    p_previous, p_new, p_reason, p_origin, p_result, coalesce(p_correlation, gen_random_uuid()))
$$;

create function email.record_event(
  p_message uuid, p_type text, p_from text, p_to text, p_attempt integer, p_error text,
  p_provider_event text, p_correlation uuid
) returns void
language sql security definer set search_path = '' as $$
  insert into email.message_events (message_id, event_type, from_status, to_status, attempt,
    error_code, provider_event_id, correlation_id)
  values (p_message, p_type, p_from, p_to, coalesce(p_attempt, 0), p_error, p_provider_event, p_correlation)
$$;

-- Alert emails are also channel attempts of the notification recipient (Database
-- `notification_delivery_attempts`), so the notification center can show them.
create function email.mirror_attempt(p_message uuid, p_status text, p_attempt integer, p_error text)
returns void
language sql security definer set search_path = '' as $$
  insert into notifications.notification_delivery_attempts (notification_recipient_id, channel,
    provider_message_id, status, attempt_number, error_code)
  select m.notification_recipient_id, 'EMAIL', m.provider_message_id, p_status,
    greatest(coalesce(p_attempt, 1), 1), p_error
  from email.messages m where m.id = p_message and m.notification_recipient_id is not null
$$;

-- A recipient is valid only while it is an active registered user with an active, current
-- membership in the account and the effective permission (ALLOW without DENY).
create function email.recipient_allowed(p_account uuid, p_user uuid, p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from identity.account_memberships m
    join identity.users u on u.id = m.user_id and u.status = 'ACTIVE'
    where m.account_id = p_account and m.user_id = p_user and m.status = 'ACTIVE'
      and m.valid_from <= now() and (m.valid_to is null or m.valid_to > now())
      and notifications.membership_allows(m.id, p_permission))
$$;

-- Queues one message. Idempotent by key: repeating it returns the existing message without
-- queuing again. Errors: 22023 invalid template, variables or key; IC403 recipient not allowed.
create function email.request(
  p_template_key text, p_template_version integer, p_account_id uuid, p_user_id uuid,
  p_permission text, p_variables jsonb, p_idempotency_key text, p_source_type text,
  p_source_id uuid, p_origin_event_id uuid, p_origin_event_type text,
  p_notification_recipient_id uuid, p_correlation_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  template email.templates%rowtype;
  existing uuid;
  new_message uuid;
  new_job uuid;
  sent bigint;
  policy_max integer;
  correlation uuid := coalesce(p_correlation_id, gen_random_uuid());
begin
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'Invalid email idempotency key';
  end if;
  select m.id into existing from email.messages m where m.idempotency_key = p_idempotency_key;
  if existing is not null then
    return existing;
  end if;
  select * into template from email.templates t
    where t.template_key = p_template_key and t.version = p_template_version and t.status = 'ACTIVE';
  if template.template_key is null then
    raise exception using errcode = '22023', message = 'Unknown or retired email template';
  end if;
  if p_variables is null or jsonb_typeof(p_variables) <> 'object'
     or array(select k from jsonb_object_keys(p_variables) k order by k collate "C")
        is distinct from array(select v from unnest(template.variables) v order by v collate "C") then
    raise exception using errcode = '22023', message = 'Template variables do not match the template version';
  end if;
  if not email.recipient_allowed(p_account_id, p_user_id, p_permission) then
    raise exception using errcode = 'IC403', message = 'Recipient is not a registered, authorized user of the account';
  end if;
  if p_notification_recipient_id is not null and not exists (select 1
      from notifications.notification_recipients r where r.id = p_notification_recipient_id
        and r.account_id = p_account_id and r.user_id = p_user_id) then
    raise exception using errcode = '22023', message = 'Notification recipient does not match';
  end if;
  insert into email.messages (idempotency_key, message_type, template_key, template_version,
    account_id, recipient_user_id, recipient_permission, notification_recipient_id, source_type,
    source_id, origin_event_id, origin_event_type, variables, correlation_id)
  values (p_idempotency_key, template.message_type, template.template_key, template.version,
    p_account_id, p_user_id, p_permission, p_notification_recipient_id, left(p_source_type, 60),
    p_source_id, p_origin_event_id, left(p_origin_event_type, 120), p_variables, correlation)
  on conflict (idempotency_key) do nothing
  returning id into new_message;
  if new_message is null then -- concurrent request with the same key
    select m.id into strict existing from email.messages m where m.idempotency_key = p_idempotency_key;
    return existing;
  end if;
  select q.max_attempts into strict policy_max from infra.queue_policies q where q.queue_name = 'email_deliveries';
  insert into infra.async_jobs (job_type, account_id, source_type, source_id, idempotency_key,
    queue_name, status, max_attempts, event_type, correlation_id)
  values ('EMAIL', p_account_id, 'EmailMessage', new_message, 'email_deliveries:' || new_message,
    'email_deliveries', 'QUEUED', policy_max, coalesce(left(p_origin_event_type, 120), 'EmailRequested'),
    correlation)
  returning id into new_job;
  perform infra.record_job_transition(new_job, null, 'QUEUED', 0, null);
  select pgmq.send('email_deliveries', jsonb_build_object('messageVersion', 1, 'jobId', new_job,
    'emailMessageId', new_message, 'accountId', p_account_id, 'correlationId', correlation)) into sent;
  update infra.async_jobs j set message_id = sent where j.id = new_job;
  update email.messages m set job_id = new_job where m.id = new_message;
  perform email.record_event(new_message, 'QUEUED', null, 'QUEUED', 0, null, null, correlation);
  perform email.mirror_attempt(new_message, 'QUEUED', 1, null);
  perform email.write_audit(p_account_id, new_message, 'EmailQueued', null,
    jsonb_build_object('status', 'QUEUED', 'messageType', template.message_type,
      'template', template.template_key, 'templateVersion', template.version,
      'recipientUserId', p_user_id, 'sourceType', p_source_type, 'sourceId', p_source_id,
      'originEventId', p_origin_event_id, 'jobId', new_job),
    null, 'SUCCESS', 'WORKER', correlation);
  return new_message;
end $$;

-- RF-ALT-003/RF-ALT-008: every CRITICAL alert also goes by email to each of its recipients.
-- Runs in the `email-alerts` consumer transaction after `notification-center`. Returns the
-- number of messages queued, or -1 when the alert of an enabled rule is not ingested yet (the
-- consumer then retries). Idempotent by (alert, recipient).
create function email.enqueue_alert(p_message jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  event notifications.notification_events%rowtype;
  rule notifications.event_rules%rowtype;
  account_name text;
  recipient record;
  queued integer := 0;
begin
  select * into rule from notifications.event_rules r where r.event_type = p_message ->> 'type';
  select * into event from notifications.notification_events e
    where e.origin_event_id = (p_message ->> 'eventId')::uuid;
  if event.id is null then
    return case when coalesce(rule.enabled, false) then -1 else 0 end;
  end if;
  if event.priority <> 'CRITICAL' then
    return 0;
  end if;
  select * into strict rule from notifications.event_rules r where r.event_type = event.origin_event_type;
  select a.name into strict account_name from identity.accounts a where a.id = event.account_id;
  for recipient in
    select r.id, r.user_id from notifications.notification_recipients r
    where r.notification_event_id = event.id order by r.created_at, r.id
  loop
    -- A recipient who lost access after the alert was created keeps the in-app alert only.
    if not email.recipient_allowed(event.account_id, recipient.user_id, rule.recipient_permission) then
      continue;
    end if;
    perform email.request('alert.critical', 1, event.account_id, recipient.user_id,
      rule.recipient_permission,
      jsonb_build_object('accountName', account_name, 'title', event.title,
        'message', event.message,
        'occurredAt', to_char(event.occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
        'actionPath', event.action_required ->> 'href', 'actionLabel', event.action_required ->> 'label'),
      'alert:' || event.id || ':' || recipient.user_id, 'NotificationEvent', event.id,
      event.origin_event_id, event.origin_event_type, recipient.id, event.correlation_id);
    queued := queued + 1;
  end loop;
  return queued;
end $$;

-- Starts (or resumes) one delivery and tells the worker what to do: SEND (with the address and
-- the stored template inputs), DONE when it was already sent (duplicate delivery), REJECTED when
-- the recipient is no longer authorized (terminal, nothing is sent) or MISSING when the queue
-- message does not match a registered job. A FAILED message re-queued by support (INT-004)
-- returns to QUEUED here.
create function email.delivery_start(
  p_job_id uuid, p_message_id uuid, p_queue text, p_queue_message_id bigint, p_attempt integer
) returns table (action text, account_id uuid, recipient_user_id uuid, recipient_address text,
  locale text, time_zone text, template_key text, template_version integer, variables jsonb,
  idempotency_key text, correlation_id uuid)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  job infra.async_jobs%rowtype;
  message email.messages%rowtype;
  next_action text;
  address text;
  user_locale text;
  user_zone text;
begin
  select * into job from infra.async_jobs j
    where j.id = p_job_id and j.job_type = 'EMAIL' and j.source_type = 'EmailMessage'
      and j.source_id = p_message_id and j.queue_name = p_queue
    for update;
  select * into message from email.messages m where m.id = p_message_id and m.job_id = job.id for update;
  if job.id is null or message.id is null then
    return query select 'MISSING'::text, null::uuid, null::uuid, null::text, null::text, null::text,
      null::text, null::integer, null::jsonb, null::text, null::uuid;
    return;
  end if;
  if message.status in ('SENT','DELIVERED','BOUNCED') then
    next_action := 'DONE';
  else
    if message.status = 'FAILED' then
      update email.messages m set status = 'QUEUED', last_error_code = null where m.id = message.id;
      perform email.record_event(message.id, 'REQUEUED', 'FAILED', 'QUEUED', p_attempt, null, null, message.correlation_id);
      perform email.write_audit(message.account_id, message.id, 'EmailRequeued',
        jsonb_build_object('status', 'FAILED', 'errorCode', message.last_error_code),
        jsonb_build_object('status', 'QUEUED', 'jobId', job.id), null, 'SUCCESS', 'WORKER',
        message.correlation_id);
    end if;
    if email.recipient_allowed(message.account_id, message.recipient_user_id, message.recipient_permission) then
      next_action := 'SEND';
      select u.email, u.locale, u.time_zone into strict address, user_locale, user_zone
        from identity.users u where u.id = message.recipient_user_id;
    else
      next_action := 'REJECTED';
      update email.messages m set status = 'FAILED', failed_at = now(), attempt_count = greatest(m.attempt_count, p_attempt),
        last_error_code = 'RECIPIENT_NOT_AUTHORIZED' where m.id = message.id;
      perform email.record_event(message.id, 'RECIPIENT_REJECTED', 'QUEUED', 'FAILED', p_attempt,
        'RECIPIENT_NOT_AUTHORIZED', null, message.correlation_id);
      perform email.mirror_attempt(message.id, 'FAILED', p_attempt, 'RECIPIENT_NOT_AUTHORIZED');
      perform email.write_audit(message.account_id, message.id, 'EmailRecipientRejected',
        jsonb_build_object('status', 'QUEUED'),
        jsonb_build_object('status', 'FAILED', 'recipientUserId', message.recipient_user_id,
          'permission', message.recipient_permission),
        'Recipient is no longer an active, authorized user of the account; nothing was sent',
        'DENIED', 'WORKER', message.correlation_id);
    end if;
  end if;
  if job.status <> 'SUCCEEDED' then
    update infra.async_jobs j set status = 'RUNNING', attempt_count = p_attempt, message_id = p_queue_message_id,
      started_at = now(), finished_at = null, next_attempt_at = null, error_code = null, error_detail_user = null
    where j.id = job.id;
    perform infra.record_job_transition(job.id, job.status, 'RUNNING', p_attempt, null);
  end if;
  return query select next_action, message.account_id, message.recipient_user_id,
    case when next_action = 'SEND' then address end, user_locale, user_zone,
    message.template_key::text, message.template_version, message.variables,
    message.idempotency_key::text, message.correlation_id;
end $$;

-- Applies one stored provider event to its message. Out-of-order or stale events are kept as
-- IGNORED; events for a message whose send is not recorded yet stay PENDING.
create function email.apply_provider_event(p_event_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  pe email.provider_events%rowtype;
  message email.messages%rowtype;
  target text;
begin
  select * into strict pe from email.provider_events e where e.id = p_event_id for update;
  if pe.outcome <> 'PENDING' then
    return pe.outcome;
  end if;
  select * into message from email.messages m
    where m.provider = pe.provider and m.provider_message_id = pe.provider_message_id for update;
  if message.id is null then
    return 'PENDING';
  end if;
  target := case
    when pe.event_type = 'DELIVERED' and message.status = 'SENT' then 'DELIVERED'
    when pe.event_type = 'BOUNCED' and message.status in ('SENT','DELIVERED') then 'BOUNCED'
  end;
  if target is null then
    update email.provider_events e set outcome = 'IGNORED', message_id = message.id, applied_at = now()
      where e.id = pe.id;
    return 'IGNORED';
  end if;
  update email.messages m set status = target,
    delivered_at = case when target = 'DELIVERED' then pe.occurred_at else m.delivered_at end,
    bounced_at = case when target = 'BOUNCED' then pe.occurred_at else m.bounced_at end
  where m.id = message.id;
  perform email.record_event(message.id, target, message.status, target, message.attempt_count,
    case when target = 'BOUNCED' then 'PROVIDER_BOUNCED' end, pe.provider_event_id, pe.correlation_id);
  perform email.mirror_attempt(message.id, target, message.attempt_count,
    case when target = 'BOUNCED' then 'PROVIDER_BOUNCED' end);
  perform email.write_audit(message.account_id, message.id,
    case target when 'DELIVERED' then 'EmailDelivered' else 'EmailBounced' end,
    jsonb_build_object('status', message.status),
    jsonb_build_object('status', target, 'provider', pe.provider, 'providerEventId', pe.provider_event_id,
      'providerOccurredAt', pe.occurred_at),
    null, case when target = 'BOUNCED' then 'FAILED' else 'SUCCESS' end, 'WEBHOOK', message.correlation_id);
  update email.provider_events e set outcome = 'APPLIED', message_id = message.id, applied_at = now()
    where e.id = pe.id;
  return 'APPLIED';
end $$;

-- The provider accepted the message. Repeating it for a message already sent is a no-op that
-- returns the current status. Tracking events received earlier are applied now.
create function email.delivery_record_sent(
  p_job_id uuid, p_message_id uuid, p_provider text, p_provider_message_id text,
  p_address_sha256 text, p_attempt integer
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  message email.messages%rowtype;
  pending uuid;
begin
  select * into message from email.messages m where m.id = p_message_id and m.job_id = p_job_id for update;
  if message.id is null then
    raise exception using errcode = 'IC404', message = 'Email message not found';
  end if;
  if message.status <> 'QUEUED' then
    return message.status;
  end if;
  if p_provider_message_id is null or length(p_provider_message_id) not between 1 and 255 then
    raise exception using errcode = '22023', message = 'Invalid provider message id';
  end if;
  update email.messages m set status = 'SENT', sent_at = now(), provider = p_provider,
    provider_message_id = p_provider_message_id, recipient_address_sha256 = p_address_sha256,
    attempt_count = greatest(m.attempt_count, p_attempt), last_error_code = null
  where m.id = message.id;
  perform email.record_event(message.id, 'SENT', 'QUEUED', 'SENT', p_attempt, null, null, message.correlation_id);
  perform email.mirror_attempt(message.id, 'SENT', p_attempt, null);
  perform email.write_audit(message.account_id, message.id, 'EmailSent',
    jsonb_build_object('status', 'QUEUED'),
    jsonb_build_object('status', 'SENT', 'provider', p_provider, 'providerMessageId', p_provider_message_id,
      'attempt', p_attempt, 'template', message.template_key, 'templateVersion', message.template_version),
    null, 'SUCCESS', 'WORKER', message.correlation_id);
  for pending in select e.id from email.provider_events e
    where e.provider = p_provider and e.provider_message_id = p_provider_message_id and e.outcome = 'PENDING'
    order by e.occurred_at, e.received_at, e.id
  loop
    perform email.apply_provider_event(pending);
  end loop;
  return 'SENT';
end $$;

-- A delivery attempt failed before the provider accepted it. Every attempt is recorded and
-- audited; once the retry policy is exhausted (or the provider rejected it permanently) the
-- message is FAILED and its job waits in the DLQ for an audited manual retry.
create function email.delivery_record_failure(
  p_job_id uuid, p_message_id uuid, p_error_code text, p_attempt integer, p_dead_lettered boolean
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  message email.messages%rowtype;
begin
  if p_error_code is null or p_error_code !~ '^[A-Z][A-Z0-9_]{1,79}$' then
    raise exception using errcode = '22023', message = 'Invalid error code';
  end if;
  select * into message from email.messages m where m.id = p_message_id and m.job_id = p_job_id for update;
  if message.id is null then
    raise exception using errcode = 'IC404', message = 'Email message not found';
  end if;
  if message.status <> 'QUEUED' then
    return message.status;
  end if;
  update email.messages m set attempt_count = greatest(m.attempt_count, p_attempt), last_error_code = p_error_code,
    status = case when p_dead_lettered then 'FAILED' else m.status end,
    failed_at = case when p_dead_lettered then now() else m.failed_at end
  where m.id = message.id;
  perform email.record_event(message.id, 'ATTEMPT_FAILED', 'QUEUED', 'QUEUED', p_attempt, p_error_code, null, message.correlation_id);
  perform email.mirror_attempt(message.id, 'FAILED', p_attempt, p_error_code);
  perform email.write_audit(message.account_id, message.id, 'EmailDeliveryAttemptFailed', null,
    jsonb_build_object('attempt', p_attempt, 'errorCode', p_error_code, 'retryScheduled', not p_dead_lettered),
    'The provider did not accept the message', 'FAILED', 'WORKER', message.correlation_id);
  if not p_dead_lettered then
    return 'QUEUED';
  end if;
  perform email.record_event(message.id, 'FAILED', 'QUEUED', 'FAILED', p_attempt, p_error_code, null, message.correlation_id);
  perform email.write_audit(message.account_id, message.id, 'EmailFailed',
    jsonb_build_object('status', 'QUEUED'),
    jsonb_build_object('status', 'FAILED', 'errorCode', p_error_code, 'attempts', p_attempt, 'jobId', p_job_id),
    'Delivery retries exhausted; waiting for an audited manual retry', 'FAILED', 'WORKER', message.correlation_id);
  return 'FAILED';
end $$;

-- Verified webhook (or reconciliation query) result. Idempotent by (provider, event id); the
-- same id with a different payload is a conflict (IC409).
create function email.record_provider_event(
  p_provider text, p_provider_event_id text, p_event_type text, p_provider_message_id text,
  p_occurred_at timestamptz, p_payload_sha256 text, p_correlation_id uuid
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  new_event uuid;
  existing email.provider_events%rowtype;
begin
  insert into email.provider_events (provider, provider_event_id, event_type, provider_message_id,
    occurred_at, payload_sha256, correlation_id)
  values (p_provider, p_provider_event_id, p_event_type, p_provider_message_id, p_occurred_at,
    p_payload_sha256, coalesce(p_correlation_id, gen_random_uuid()))
  on conflict (provider, provider_event_id) do nothing
  returning id into new_event;
  if new_event is null then
    select * into strict existing from email.provider_events e
      where e.provider = p_provider and e.provider_event_id = p_provider_event_id;
    if existing.payload_sha256 <> p_payload_sha256 then
      raise exception using errcode = 'IC409', message = 'Provider event id reused with different content';
    end if;
    return 'DUPLICATE';
  end if;
  return email.apply_provider_event(new_event);
end $$;

-- Delivery queue; same retry/DLQ model as domain events and file scans.
do $$
declare
  target_queue_name text;
begin
  foreach target_queue_name in array array['email_deliveries', 'email_deliveries_dlq']
  loop
    if not exists (select 1 from pgmq.list_queues() existing_queue
                   where existing_queue.queue_name = target_queue_name) then
      perform pgmq.create(target_queue_name);
    end if;
  end loop;
end
$$;
insert into infra.queue_policies (queue_name, dead_letter_queue, visibility_timeout_seconds, max_attempts)
values ('email_deliveries', 'email_deliveries_dlq', 60, 5)
on conflict (queue_name) do nothing;

alter table email.templates enable row level security;
alter table email.messages enable row level security;
alter table email.message_events enable row level security;
alter table email.provider_events enable row level security;
revoke all on schema email from public, anon, authenticated;
revoke all on all tables in schema email from public, anon, authenticated, service_role;
revoke all on all functions in schema email from public, anon, authenticated, service_role;
grant usage on schema email to service_role;
-- The runtime reads; every change goes through the functions below. Messages hold no address.
grant select on email.templates, email.messages, email.message_events, email.provider_events
  to service_role;
grant execute on function
  email.request(text, integer, uuid, uuid, text, jsonb, text, text, uuid, uuid, text, uuid, uuid),
  email.enqueue_alert(jsonb),
  email.delivery_start(uuid, uuid, text, bigint, integer),
  email.delivery_record_sent(uuid, uuid, text, text, text, integer),
  email.delivery_record_failure(uuid, uuid, text, integer, boolean),
  email.record_provider_event(text, text, text, text, timestamptz, text, uuid)
  to service_role;
