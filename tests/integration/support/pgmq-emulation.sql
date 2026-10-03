-- Test-only emulation of the PGMQ/pg_cron/storage surface used by ICE24 migrations,
-- so Testcontainers can run plain PostgreSQL. Signatures follow PGMQ 1.x; real PGMQ is
-- exercised by supabase/tests/database (pgTAP) in the supabase-migrations CI job.
create schema if not exists pgmq;
create table pgmq.meta (queue_name text primary key);
create type pgmq.message_record as (msg_id bigint, read_ct integer, enqueued_at timestamptz,
  vt timestamptz, message jsonb);

create function pgmq.list_queues() returns table (queue_name text)
language sql as $$ select m.queue_name from pgmq.meta m $$;

create function pgmq."create"(queue_name text) returns void
language plpgsql as $$
begin
  insert into pgmq.meta values (queue_name) on conflict do nothing;
  execute format('create table if not exists pgmq.%I (msg_id bigserial primary key,
    read_ct integer not null default 0, enqueued_at timestamptz not null default now(),
    vt timestamptz not null default now(), message jsonb)', 'q_' || queue_name);
  execute format('create table if not exists pgmq.%I (msg_id bigint primary key,
    read_ct integer, enqueued_at timestamptz, archived_at timestamptz not null default now(),
    vt timestamptz, message jsonb)', 'a_' || queue_name);
end $$;

create function pgmq.drop_queue(queue_name text) returns boolean
language plpgsql as $$
begin
  delete from pgmq.meta m where m.queue_name = drop_queue.queue_name;
  execute format('drop table if exists pgmq.%I, pgmq.%I', 'q_' || queue_name, 'a_' || queue_name);
  return true;
end $$;

create function pgmq.send(queue_name text, msg jsonb, delay integer default 0) returns setof bigint
language plpgsql as $$
begin
  if not exists (select 1 from pgmq.meta m where m.queue_name = send.queue_name) then
    raise exception 'queue % does not exist', queue_name;
  end if;
  return query execute format(
    'insert into pgmq.%I (message, vt) values ($1, clock_timestamp() + make_interval(secs => $2)) returning msg_id',
    'q_' || queue_name) using msg, delay;
end $$;

create function pgmq.read(queue_name text, vt integer, qty integer)
returns setof pgmq.message_record
language plpgsql as $$
begin
  return query execute format(
    'with next as (select q.msg_id from pgmq.%1$I q where q.vt <= clock_timestamp()
       order by q.msg_id limit $2 for update skip locked)
     update pgmq.%1$I q set vt = clock_timestamp() + make_interval(secs => $1), read_ct = q.read_ct + 1
     from next where q.msg_id = next.msg_id
     returning q.msg_id, q.read_ct, q.enqueued_at, q.vt, q.message',
    'q_' || queue_name) using vt, qty;
end $$;

create function pgmq.archive(queue_name text, msg_id bigint) returns boolean
language plpgsql as $$
declare
  moved integer;
begin
  execute format(
    'with gone as (delete from pgmq.%I q where q.msg_id = $1 returning *)
     insert into pgmq.%I (msg_id, read_ct, enqueued_at, vt, message)
     select g.msg_id, g.read_ct, g.enqueued_at, g.vt, g.message from gone g',
    'q_' || queue_name, 'a_' || queue_name) using msg_id;
  get diagnostics moved = row_count;
  return moved > 0;
end $$;

create function pgmq.set_vt(queue_name text, msg_id bigint, vt integer)
returns setof pgmq.message_record
language plpgsql as $$
begin
  return query execute format(
    'update pgmq.%I q set vt = clock_timestamp() + make_interval(secs => $2) where q.msg_id = $1
     returning q.msg_id, q.read_ct, q.enqueued_at, q.vt, q.message', 'q_' || queue_name)
    using msg_id, vt;
end $$;

create function pgmq.metrics(queue_name text) returns table (queue_length bigint)
language plpgsql as $$
begin
  return query execute format('select count(*) from pgmq.%I', 'q_' || queue_name);
end $$;

create schema if not exists cron;
create table cron.job (jobid bigserial primary key, jobname text, schedule text, command text);
create function cron.schedule(job_name text, schedule text, command text) returns bigint
language sql as $$ insert into cron.job (jobname, schedule, command) values (job_name, schedule, command) returning jobid $$;
create function cron.unschedule(job_id bigint) returns boolean
language sql as $$ delete from cron.job where jobid = job_id returning true $$;

create schema if not exists storage;
create table storage.buckets (id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]);
