-- F5-10: durable authorization, then append-only signing outcome. No signed URL is stored.
create table files.download_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.accounts(id),
  file_version_id uuid not null references files.file_versions(id),
  user_id uuid not null references identity.users(id),
  context_session_id uuid,
  purpose varchar(120) not null check (length(trim(purpose)) between 3 and 120),
  correlation_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at and expires_at <= created_at + interval '5 minutes')
);
create table files.download_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique references files.download_sessions(id),
  account_id uuid not null references identity.accounts(id),
  file_version_id uuid not null references files.file_versions(id),
  access_type varchar(20) not null check (access_type in ('PRIVATE','PUBLIC')),
  user_id uuid references identity.users(id),
  machine_id uuid references equipment.machines(id),
  downloaded_at timestamptz not null default now(),
  ip_hash varchar(128),
  result varchar(20) not null check (result in ('AUTHORIZED','DENIED','EXPIRED','ERROR')),
  created_at timestamptz not null default now(),
  correlation_id uuid not null,
  check (access_type <> 'PRIVATE' or user_id is not null)
);
create index download_events_version_time on files.download_events(file_version_id, downloaded_at desc, id desc);
create index download_events_user_time on files.download_events(user_id, downloaded_at desc, id desc);
create index download_events_account_time on files.download_events(account_id, downloaded_at desc, id desc);
create index download_events_machine_time on files.download_events(machine_id, downloaded_at desc) where machine_id is not null;

create function files.guard_download_history() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = '23514', message = 'Download history is append-only';
end $$;
create trigger download_events_immutable before update or delete on files.download_events
for each row execute function files.guard_download_history();
create trigger download_sessions_immutable before update or delete on files.download_sessions
for each row execute function files.guard_download_history();

-- Return denial as data so audit commits before the adapter maps it to HTTP 404/409.
create function files.prepare_download(
  p_file_id uuid, p_account_id uuid, p_actor uuid, p_context uuid,
  p_account_wide boolean, p_branches uuid[], p_machines uuid[], p_purpose text,
  p_ttl integer, p_correlation uuid
) returns table (outcome text, session_id uuid, bucket_id text, object_key text,
  file_name text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  f files.file_objects%rowtype;
  v files.file_versions%rowtype;
  sid uuid;
  expiry timestamptz;
  result_code text;
  correlation uuid := coalesce(p_correlation, gen_random_uuid());
begin
  if p_actor is null or p_account_id is null or p_ttl is null or p_ttl not between 1 and 300
    or p_purpose is null or length(trim(p_purpose)) not between 3 and 120 then
    raise exception using errcode = '22023', message = 'Invalid download authorization';
  end if;
  if not files.file_visible(p_file_id,p_account_id,p_account_wide,p_branches,p_machines) then
    perform files.write_audit(p_actor,p_context,p_account_id,p_file_id,'FileReadDenied',null,
      jsonb_build_object('result','DENIED'),'File outside authorized scope','DENIED',correlation);
    return query select 'NOT_FOUND'::text,null::uuid,null::text,null::text,null::text,null::timestamptz;
    return;
  end if;
  select * into strict f from files.file_objects where id=p_file_id for share;
  select * into v from files.file_versions where id=f.current_version_id for share;
  expiry := least(clock_timestamp() + make_interval(secs => p_ttl), v.expires_at);
  result_code := case when v.expires_at <= clock_timestamp() then 'EXPIRED' else 'DENIED' end;
  if f.status <> 'AVAILABLE' or v.id is null or v.available_at is null or v.scan_status <> 'CLEAN'
    or v.storage_zone not in ('PRIVATE_ORIGINAL','EXPORT') or v.purged_at is not null
    or expiry <= clock_timestamp() + interval '1 second' then
    if v.id is not null then
      insert into files.download_events(account_id,file_version_id,access_type,user_id,result,correlation_id)
        values(p_account_id,v.id,'PRIVATE',p_actor,result_code,correlation);
    end if;
    perform files.write_audit(p_actor,p_context,p_account_id,p_file_id,'FileReadDenied',null,
      jsonb_build_object('versionId',v.id,'result',result_code,'purpose',p_purpose),
      'File not available','DENIED',correlation);
    return query select 'UNAVAILABLE'::text,null::uuid,null::text,null::text,null::text,null::timestamptz;
    return;
  end if;
  -- now() anchors the constraint and avoids exceeding the five-minute upper bound.
  expiry := least(expiry, now() + make_interval(secs => p_ttl));
  insert into files.download_sessions(account_id,file_version_id,user_id,context_session_id,purpose,correlation_id,expires_at)
    values(p_account_id,v.id,p_actor,p_context,trim(p_purpose),correlation,expiry) returning id into sid;
  perform files.write_audit(p_actor,p_context,p_account_id,p_file_id,'FileReadAuthorized',null,
    jsonb_build_object('versionId',v.id,'downloadSessionId',sid,'purpose',p_purpose,'expiresAt',expiry),
    null,'SUCCESS',correlation);
  return query select 'AUTHORIZED'::text,sid,
    case v.storage_zone when 'EXPORT' then 'exports' else 'originals' end,
    v.object_key::text,v.original_filename::text,expiry;
end $$;

-- A URL is not returned until this transaction commits. Re-check the exact authorized
-- version and scope after signing; never resolve the current version to a different object.
create function files.finish_download(
  p_session uuid, p_account uuid, p_actor uuid, p_account_wide boolean,
  p_branches uuid[], p_machines uuid[], p_result text
) returns text language plpgsql security definer set search_path = '' as $$
declare
  s files.download_sessions%rowtype;
  v files.file_versions%rowtype;
  f files.file_objects%rowtype;
  final_result text;
begin
  if p_result is null or p_result not in ('AUTHORIZED','ERROR','EXPIRED') then
    raise exception using errcode='22023', message='Invalid download result';
  end if;
  select * into s from files.download_sessions
    where id=p_session and account_id=p_account and user_id=p_actor for update;
  if not found then raise exception using errcode='IC404', message='Session not found'; end if;
  select result into final_result from files.download_events where session_id=s.id;
  if found then return final_result; end if;
  select * into strict f from files.file_objects where id=(select file_object_id from files.file_versions where id=s.file_version_id) for share;
  select * into strict v from files.file_versions where id=s.file_version_id for share;
  final_result := p_result;
  if s.expires_at <= clock_timestamp() or v.expires_at <= clock_timestamp() then
    final_result := 'EXPIRED';
  elsif f.current_version_id <> v.id or f.status <> 'AVAILABLE' or v.scan_status <> 'CLEAN'
    or v.purged_at is not null or v.available_at is null
    or not files.file_visible(f.id,p_account,p_account_wide,p_branches,p_machines) then
    final_result := 'DENIED';
  end if;
  insert into files.download_events(session_id,account_id,file_version_id,access_type,user_id,result,correlation_id)
    values(s.id,s.account_id,s.file_version_id,'PRIVATE',s.user_id,final_result,s.correlation_id);
  perform files.write_audit(s.user_id,s.context_session_id,s.account_id,f.id,'FileDownloadRecorded',null,
    jsonb_build_object('downloadSessionId',s.id,'versionId',v.id,'accessType','PRIVATE',
      'result',final_result,'purpose',s.purpose,'expiresAt',s.expires_at),null,
    case final_result when 'AUTHORIZED' then 'SUCCESS' when 'ERROR' then 'FAILED' else 'DENIED' end,
    s.correlation_id);
  return final_result;
end $$;

alter table files.download_sessions enable row level security;
alter table files.download_events enable row level security;
revoke all on files.download_sessions, files.download_events from public,anon,authenticated,service_role;
revoke all on function files.guard_download_history(),
  files.prepare_download(uuid,uuid,uuid,uuid,boolean,uuid[],uuid[],text,integer,uuid),
  files.finish_download(uuid,uuid,uuid,boolean,uuid[],uuid[],text) from public,anon,authenticated,service_role;
grant select on files.download_events to service_role;
grant execute on function files.prepare_download(uuid,uuid,uuid,uuid,boolean,uuid[],uuid[],text,integer,uuid),
  files.finish_download(uuid,uuid,uuid,boolean,uuid[],uuid[],text) to service_role;
