-- F5-05: outbox publisher. PGMQ lives in the same database, so sending the message
-- and marking the event published commit atomically: no loss window, no double send.
do $$
declare
  target_queue_name text;
begin
  foreach target_queue_name in array array['domain_events', 'domain_events_dlq']
  loop
    if not exists (
      select 1 from pgmq.list_queues() existing_queue
      where existing_queue.queue_name = target_queue_name
    ) then
      perform pgmq.create(target_queue_name);
    end if;
  end loop;
end
$$;

insert into infra.queue_policies (queue_name, dead_letter_queue, visibility_timeout_seconds, max_attempts)
values ('domain_events', 'domain_events_dlq', 60, 5)
on conflict (queue_name) do nothing;

-- Versioned message contract: OutboxMessage v1 in @ice24/contracts.
create function infra.outbox_message(event infra.outbox_events) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'messageVersion', 1,
    'eventId', event.id,
    'type', event.event_type,
    'eventVersion', event.event_version,
    'aggregateType', event.aggregate_type,
    'aggregateId', event.aggregate_id,
    'aggregateVersion', event.aggregate_version,
    'accountId', event.account_id,
    'actor', jsonb_build_object('type', event.actor_type, 'userId', event.actor_user_id),
    'contextSessionId', event.context_session_id,
    'correlationId', event.correlation_id,
    'causationId', event.causation_id,
    'occurredAt', to_char(event.occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'sensitivity', event.sensitivity,
    'payload', event.payload
  )
$$;

create function infra.publish_outbox(batch_size integer default 100)
returns table (published integer, failed integer, pending bigint)
language plpgsql security definer set search_path = '' as $$
declare
  candidate infra.outbox_events%rowtype;
  published_count integer := 0;
  failed_count integer := 0;
begin
  if batch_size < 1 or batch_size > 500 then
    raise exception using errcode = '22023', message = 'batch_size must be between 1 and 500';
  end if;
  for candidate in
    select * from infra.outbox_events o
    where o.published_at is null and o.available_at <= now()
    order by o.occurred_at, o.id
    for update skip locked
    limit batch_size
  loop
    begin
      perform pgmq.send('domain_events', infra.outbox_message(candidate));
      update infra.outbox_events o
      set published_at = now(), attempt_count = o.attempt_count + 1, last_error_code = null
      where o.id = candidate.id;
      published_count := published_count + 1;
    exception when others then
      -- The failed send is rolled back with its subtransaction; the event stays pending
      -- with visible diagnostics and exponential backoff capped at 15 minutes.
      update infra.outbox_events o
      set attempt_count = o.attempt_count + 1,
          last_error_code = left(sqlstate || ': ' || sqlerrm, 200),
          available_at = now() + make_interval(secs => least(900, 15 * power(2, least(o.attempt_count, 6))))
      where o.id = candidate.id;
      failed_count := failed_count + 1;
    end;
  end loop;
  return query select published_count, failed_count,
    (select count(*) from infra.outbox_events o where o.published_at is null);
end $$;

-- Operational view for health checks and the future jobs center (F5-07).
create view infra.outbox_status with (security_invoker = true) as
select
  count(*) filter (where published_at is null) as pending,
  count(*) filter (where published_at is null and last_error_code is not null) as failing,
  max(attempt_count) filter (where published_at is null) as max_attempts,
  extract(epoch from now() - min(occurred_at) filter (where published_at is null))::bigint
    as oldest_pending_seconds
from infra.outbox_events;

revoke all on function infra.outbox_message(infra.outbox_events), infra.publish_outbox(integer)
  from public, anon, authenticated;
grant execute on function infra.publish_outbox(integer) to service_role;
revoke all on infra.outbox_status from public, anon, authenticated;
grant select on infra.outbox_status to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'ice24_publish_outbox';
select cron.schedule('ice24_publish_outbox', '* * * * *', 'select infra.publish_outbox(200)');
