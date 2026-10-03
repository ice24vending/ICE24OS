-- F5-06: idempotent domain-event consumers. Delivery is at least once; each consumer
-- records the event it applied in the same transaction as its effect.
create table infra.processed_messages (
  consumer varchar(80) not null check (consumer ~ '^[a-z][a-z0-9-]{2,79}$'),
  event_id uuid not null,
  event_type varchar(120) not null,
  queue_name text not null references infra.queue_policies(queue_name),
  message_id bigint not null,
  attempt integer not null check (attempt >= 1),
  processed_at timestamptz not null default now(),
  primary key (consumer, event_id)
);
create index processed_messages_time on infra.processed_messages (processed_at);
create index processed_messages_event on infra.processed_messages (event_id);

create function infra.reject_processed_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = '55000', message = 'Processed messages are append-only';
end $$;
create trigger processed_messages_immutable before update or delete on infra.processed_messages
for each statement execute function infra.reject_processed_mutation();
create trigger processed_messages_no_truncate before truncate on infra.processed_messages
for each statement execute function infra.reject_processed_mutation();

-- Workers reach PGMQ only through these wrappers, limited to queues with a policy.
create function infra.read_queue(p_queue text, p_visibility_seconds integer, p_quantity integer)
returns table (msg_id bigint, read_ct integer, enqueued_at timestamptz, message jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from infra.queue_policies q where q.queue_name = p_queue) then
    raise exception using errcode = '22023', message = 'Unknown queue';
  end if;
  if p_visibility_seconds < 1 or p_visibility_seconds > 3600 or p_quantity < 1 or p_quantity > 100 then
    raise exception using errcode = '22023', message = 'Invalid read window';
  end if;
  return query
    select r.msg_id, r.read_ct, r.enqueued_at, r.message
    from pgmq.read(p_queue, p_visibility_seconds, p_quantity) r;
end $$;

-- Returns false when this consumer already applied the event: skip the effect.
create function infra.claim_message(
  p_consumer text, p_event_id uuid, p_event_type text, p_queue text, p_message_id bigint, p_attempt integer
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  claimed boolean;
begin
  insert into infra.processed_messages (consumer, event_id, event_type, queue_name, message_id, attempt)
  values (p_consumer, p_event_id, p_event_type, p_queue, p_message_id, p_attempt)
  on conflict (consumer, event_id) do nothing
  returning true into claimed;
  return coalesce(claimed, false);
end $$;

create function infra.ack_message(p_queue text, p_message_id bigint) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from infra.queue_policies q where q.queue_name = p_queue) then
    raise exception using errcode = '22023', message = 'Unknown queue';
  end if;
  return pgmq.archive(p_queue, p_message_id);
end $$;

alter table infra.processed_messages enable row level security;
revoke all on infra.processed_messages from public, anon, authenticated, service_role;
grant select on infra.processed_messages to service_role;
revoke all on function infra.reject_processed_mutation(),
  infra.read_queue(text, integer, integer),
  infra.claim_message(text, uuid, text, text, bigint, integer),
  infra.ack_message(text, bigint) from public, anon, authenticated;
grant execute on function infra.read_queue(text, integer, integer),
  infra.claim_message(text, uuid, text, text, bigint, integer),
  infra.ack_message(text, bigint),
  infra.fail_job(text, bigint, jsonb, integer, text) to service_role;
