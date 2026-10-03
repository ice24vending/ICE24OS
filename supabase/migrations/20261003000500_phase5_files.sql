-- F5-08: pre-authorized direct uploads to private storage, post-upload confirmation and
-- on-demand temporary read authorization. Binaries never pass through the API: the browser
-- PUTs to a short-lived signed URL scoped to `<account_id>/<file_id>/v<n>/<random>` in the
-- private `quarantine` bucket. Confirmation registers an immutable version that stays in
-- quarantine with scan PENDING until the antivirus service (F5-09) promotes it.
-- Additive migration: no existing table changes. Rollback: stop issuing sessions (feature
-- route disabled) and keep the tables; they are retained history.
create schema if not exists files;

-- Purpose policy: what may be uploaded, how big, with which sensitivity and to which entity.
-- Mirrors FILE_UPLOAD_PURPOSES in @ice24/contracts (pgTAP checks the seed).
create table files.upload_purposes (
  purpose varchar(60) primary key check (purpose ~ '^[a-z][a-z0-9_]{2,59}$'),
  media_types text[] not null check (cardinality(media_types) > 0),
  max_size_bytes bigint not null check (max_size_bytes between 1 and 52428800),
  sensitivity varchar(20) not null check (sensitivity in ('PUBLIC','INTERNAL','SENSITIVE','RESTRICTED')),
  entity_types text[] not null check (entity_types <@ array['ACCOUNT','BRANCH','MACHINE']::text[]),
  description text not null
);
insert into files.upload_purposes (purpose, media_types, max_size_bytes, sensitivity, entity_types, description) values
  ('equipment_evidence', array['image/jpeg','image/png','application/pdf'], 10485760, 'INTERNAL',
    array['BRANCH','MACHINE'], 'Operational evidence for a branch or machine'),
  ('machine_photo', array['image/jpeg','image/png'], 10485760, 'INTERNAL',
    array['MACHINE'], 'Photograph of a machine'),
  ('laboratory_analysis_original', array['application/pdf'], 26214400, 'SENSITIVE',
    array['BRANCH','MACHINE'], 'Original laboratory analysis report'),
  ('document_original', array['application/pdf','image/jpeg','image/png'], 26214400, 'SENSITIVE',
    array['ACCOUNT','BRANCH','MACHINE'], 'Original of a controlled document');

create table files.file_objects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references identity.accounts(id),
  category varchar(40) not null
    check (category in ('PHOTO','PDF','EXCEL','EXPORT','PUBLIC_DERIVATIVE','QUARANTINE')),
  title varchar(250),
  purpose varchar(60) not null references files.upload_purposes(purpose),
  status varchar(30) not null default 'PENDING_UPLOAD'
    check (status in ('PENDING_UPLOAD','VERIFYING','AVAILABLE','REJECTED','QUARANTINED','EXPIRED')),
  closed_reason varchar(30) check (closed_reason in ('ABORTED','SESSION_EXPIRED','UPLOAD_MISMATCH')),
  sensitivity varchar(20) not null check (sensitivity in ('PUBLIC','INTERNAL','SENSITIVE','RESTRICTED')),
  current_version_id uuid,
  created_by uuid not null references identity.users(id),
  correlation_id uuid,
  row_version integer not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closed_reason is null
    or (status = 'EXPIRED' and closed_reason in ('ABORTED','SESSION_EXPIRED'))
    or (status = 'REJECTED' and closed_reason = 'UPLOAD_MISMATCH'))
);
create index file_objects_account on files.file_objects (account_id, category, status);
create index file_objects_status_time on files.file_objects (status, created_at);

create table files.file_versions (
  id uuid primary key default gen_random_uuid(),
  file_object_id uuid not null references files.file_objects(id),
  version_number integer not null check (version_number > 0),
  storage_zone varchar(30) not null
    check (storage_zone in ('PRIVATE_ORIGINAL','OPTIMIZED','PUBLIC','EXPORT','QUARANTINE')),
  object_key varchar(1024) not null unique,
  original_filename varchar(500),
  media_type varchar(150) not null,
  size_bytes bigint not null check (size_bytes > 0),
  sha256 char(64) check (sha256 ~ '^[0-9a-f]{64}$'),
  scan_status varchar(30) not null default 'PENDING'
    check (scan_status in ('PENDING','CLEAN','INFECTED','FAILED')),
  scan_details jsonb check (scan_details is null or jsonb_typeof(scan_details) = 'object'),
  available_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  correlation_id uuid,
  unique (file_object_id, version_number),
  -- Usable only once verified: hash known, scan clean and outside quarantine.
  check (available_at is null or (sha256 is not null and scan_status = 'CLEAN' and storage_zone <> 'QUARANTINE'))
);
create index file_versions_sha256 on files.file_versions (sha256);
create index file_versions_scan on files.file_versions (scan_status, created_at);
alter table files.file_objects add constraint file_objects_current_version
  foreign key (current_version_id) references files.file_versions(id);

create table files.file_bindings (
  id uuid primary key default gen_random_uuid(),
  file_object_id uuid not null references files.file_objects(id),
  entity_type varchar(60) not null check (entity_type in ('ACCOUNT','BRANCH','MACHINE')),
  entity_id uuid not null,
  binding_role varchar(50) not null default 'ORIGINAL' check (binding_role ~ '^[A-Z][A-Z_]{1,49}$'),
  is_required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index file_bindings_entity on files.file_bindings (entity_type, entity_id);
create index file_bindings_file on files.file_bindings (file_object_id);

-- One pre-authorized direct upload. Only the SHA-256 of the one-time upload token is stored.
create table files.upload_sessions (
  id uuid primary key default gen_random_uuid(),
  file_object_id uuid not null unique references files.file_objects(id),
  account_id uuid not null references identity.accounts(id),
  created_by uuid not null references identity.users(id),
  idempotency_key varchar(128) not null check (idempotency_key ~ '^[A-Za-z0-9-]{8,128}$'),
  request_hash char(64) not null check (request_hash ~ '^[0-9a-f]{64}$'),
  token_hash char(64) not null check (token_hash ~ '^[0-9a-f]{64}$'),
  bucket_id text not null default 'quarantine' check (bucket_id = 'quarantine'),
  object_key varchar(1024) not null unique,
  original_filename varchar(500) not null,
  media_type varchar(150) not null,
  declared_size_bytes bigint not null check (declared_size_bytes > 0),
  max_size_bytes bigint not null check (max_size_bytes >= declared_size_bytes),
  declared_sha256 char(64) check (declared_sha256 ~ '^[0-9a-f]{64}$'),
  status varchar(20) not null default 'ISSUED'
    check (status in ('ISSUED','COMPLETED','ABORTED','EXPIRED','REJECTED')),
  job_id uuid references infra.async_jobs(id),
  expires_at timestamptz not null,
  completed_at timestamptz,
  correlation_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, created_by, idempotency_key),
  check (expires_at > created_at and expires_at <= created_at + interval '15 minutes')
);
create index upload_sessions_expiry on files.upload_sessions (expires_at) where status = 'ISSUED';

-- Tenant isolation is structural: an object key always starts with its account and file.
create function files.guard_object_key() returns trigger
language plpgsql set search_path = '' as $$
declare
  owner uuid;
begin
  select f.account_id into owner from files.file_objects f where f.id = new.file_object_id;
  if owner is null or new.object_key !~ ('^' || owner::text || '/' || new.file_object_id::text
      || '/v[0-9]+/[0-9a-f-]{36}$') then
    raise exception using errcode = '23514', message = 'Object key outside the account scope';
  end if;
  return new;
end $$;
create trigger file_versions_object_key before insert on files.file_versions
for each row execute function files.guard_object_key();
create trigger upload_sessions_object_key before insert on files.upload_sessions
for each row execute function files.guard_object_key();

create function files.guard_file_object() returns trigger
language plpgsql set search_path = '' as $$
declare
  version files.file_versions%rowtype;
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'File objects are retained; expire instead of deleting';
  end if;
  if (new.id, new.account_id, new.category, new.purpose, new.sensitivity, new.created_by, new.created_at)
     is distinct from (old.id, old.account_id, old.category, old.purpose, old.sensitivity, old.created_by, old.created_at) then
    raise exception using errcode = '55000', message = 'File ownership and classification are immutable';
  end if;
  if new.status is distinct from old.status and not (
       (old.status = 'PENDING_UPLOAD' and new.status in ('VERIFYING','REJECTED','EXPIRED'))
    or (old.status = 'VERIFYING' and new.status in ('AVAILABLE','REJECTED','QUARANTINED'))
    or (old.status = 'QUARANTINED' and new.status in ('VERIFYING','REJECTED'))
    or (old.status = 'AVAILABLE' and new.status = 'EXPIRED')
  ) then
    raise exception using errcode = 'IC409', message = format('Invalid file transition %s -> %s', old.status, new.status);
  end if;
  if new.status = 'AVAILABLE' then
    select * into version from files.file_versions v where v.id = new.current_version_id;
    if version.id is null or version.file_object_id <> new.id or version.available_at is null then
      raise exception using errcode = 'IC409', message = 'A file is available only with a verified current version';
    end if;
  end if;
  new.row_version := old.row_version + 1;
  new.updated_at := now();
  return new;
end $$;
create trigger file_objects_guard before update or delete on files.file_objects
for each row execute function files.guard_file_object();

-- Versions are physical facts: only the verification outcome may be filled in later (F5-09).
create function files.guard_file_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'File versions are append-only';
  end if;
  if (new.id, new.file_object_id, new.version_number, new.object_key, new.original_filename,
      new.media_type, new.size_bytes, new.created_at, new.correlation_id)
     is distinct from (old.id, old.file_object_id, old.version_number, old.object_key,
      old.original_filename, old.media_type, old.size_bytes, old.created_at, old.correlation_id)
     or (old.sha256 is not null and new.sha256 is distinct from old.sha256) then
    raise exception using errcode = '55000', message = 'File version facts are immutable';
  end if;
  if new.scan_status is distinct from old.scan_status and not (
       (old.scan_status = 'PENDING' and new.scan_status in ('CLEAN','INFECTED','FAILED'))
    or (old.scan_status = 'FAILED' and new.scan_status in ('PENDING','CLEAN','INFECTED'))
  ) then
    raise exception using errcode = 'IC409', message = 'Invalid scan transition';
  end if;
  if new.storage_zone is distinct from old.storage_zone
     and not (old.storage_zone = 'QUARANTINE' and new.storage_zone = 'PRIVATE_ORIGINAL' and new.scan_status = 'CLEAN') then
    raise exception using errcode = 'IC409', message = 'Only clean versions leave quarantine';
  end if;
  return new;
end $$;
create trigger file_versions_guard before update or delete on files.file_versions
for each row execute function files.guard_file_version();

create function files.reject_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = '55000', message = 'File records are retained';
end $$;
create trigger file_objects_no_truncate before truncate on files.file_objects
for each statement execute function files.reject_mutation();
create trigger file_versions_no_truncate before truncate on files.file_versions
for each statement execute function files.reject_mutation();
create trigger upload_sessions_no_delete before delete or truncate on files.upload_sessions
for each statement execute function files.reject_mutation();

-- Entity existence + authorized scope. ACCOUNT bindings need account-wide scope; a machine is
-- visible through its own scope or through its branch (same rule as equipment).
create function files.resource_in_scope(
  p_account_id uuid, p_entity_type text, p_entity_id uuid,
  p_account_wide boolean, p_branch_ids uuid[], p_machine_ids uuid[]
) returns boolean
language sql stable security definer set search_path = '' as $$
  select case p_entity_type
    when 'ACCOUNT' then p_entity_id = p_account_id and p_account_wide
    when 'BRANCH' then exists (select 1 from equipment.branches b
      where b.id = p_entity_id and b.account_id = p_account_id
        and (p_account_wide or b.id = any(coalesce(p_branch_ids, '{}'))))
    when 'MACHINE' then exists (select 1 from equipment.machines m
      where m.id = p_entity_id and m.account_id = p_account_id
        and (p_account_wide or m.id = any(coalesce(p_machine_ids, '{}'))
          or m.branch_id = any(coalesce(p_branch_ids, '{}'))))
    else false
  end
$$;

-- A file is visible when it belongs to the account and every binding is within scope.
create function files.file_visible(
  p_file_id uuid, p_account_id uuid, p_account_wide boolean, p_branch_ids uuid[], p_machine_ids uuid[]
) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from files.file_objects f where f.id = p_file_id and f.account_id = p_account_id)
    and not exists (select 1 from files.file_bindings b where b.file_object_id = p_file_id
      and not files.resource_in_scope(p_account_id, b.entity_type, b.entity_id,
        p_account_wide, p_branch_ids, p_machine_ids))
$$;

create function files.write_audit(
  p_actor uuid, p_context uuid, p_account uuid, p_file uuid, p_operation text,
  p_previous jsonb, p_new jsonb, p_reason text, p_result text, p_correlation uuid
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  zone text;
  session_id uuid := p_context;
begin
  select u.time_zone into zone from identity.users u where u.id = p_actor;
  if session_id is not null and not exists (select 1 from identity.context_sessions c
      where c.id = session_id and c.user_id = p_actor) then
    session_id := null;
  end if;
  insert into audit.events (event_version, occurred_at_utc, time_zone, actor_user_id, actor_type,
    context_session_id, account_id, entity_type, entity_id, operation, previous_values, new_values,
    reason, origin, result, correlation_id)
  values (1, now(), coalesce(zone, 'UTC'), p_actor, 'USER', session_id, p_account, 'FileObject',
    p_file, p_operation, p_previous, p_new, p_reason, 'API', p_result,
    coalesce(p_correlation, gen_random_uuid()));
end $$;

-- FIL-001. Errors: IC404 entity missing/out of scope, IC413 too large, IC415 media type,
-- IC422 invalid purpose/entity, IC412 idempotency key reused with another request,
-- IC409 the session for that key is already closed.
create function files.create_upload_session(
  p_account_id uuid, p_actor_user_id uuid, p_context_session_id uuid,
  p_idempotency_key text, p_request_hash text, p_token_hash text,
  p_purpose text, p_file_name text, p_media_type text, p_size_bytes bigint,
  p_entity_type text, p_entity_id uuid,
  p_account_wide boolean, p_branch_ids uuid[], p_machine_ids uuid[],
  p_ttl_seconds integer, p_correlation_id uuid
) returns table (file_id uuid, object_key text, expires_at timestamptz, max_size_bytes bigint, replayed boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  policy files.upload_purposes%rowtype;
  existing files.upload_sessions%rowtype;
  new_file uuid := gen_random_uuid();
  key text;
  expiry timestamptz;
begin
  if p_ttl_seconds not between 60 and 900 then
    raise exception using errcode = '22023', message = 'Upload sessions last 1 to 15 minutes';
  end if;
  select * into existing from files.upload_sessions s
    where s.account_id = p_account_id and s.created_by = p_actor_user_id
      and s.idempotency_key = p_idempotency_key for update;
  if existing.id is not null then
    if existing.request_hash <> p_request_hash then
      raise exception using errcode = 'IC412', message = 'Idempotency key reused with a different request';
    end if;
    if existing.status <> 'ISSUED' or existing.expires_at <= now() then
      raise exception using errcode = 'IC409', message = 'Upload session already closed';
    end if;
    -- Same request: rotate the one-time token so only the latest response can confirm.
    update files.upload_sessions s set token_hash = p_token_hash, updated_at = now() where s.id = existing.id;
    return query select existing.file_object_id, existing.object_key::text, existing.expires_at,
      existing.max_size_bytes, true;
    return;
  end if;
  select * into policy from files.upload_purposes u where u.purpose = p_purpose;
  if policy.purpose is null or not (p_entity_type = any(policy.entity_types)) then
    raise exception using errcode = 'IC422', message = 'Purpose not allowed for this resource';
  end if;
  if not (p_media_type = any(policy.media_types)) then
    raise exception using errcode = 'IC415', message = 'Media type not allowed for this purpose';
  end if;
  if p_size_bytes < 1 or p_size_bytes > policy.max_size_bytes then
    raise exception using errcode = 'IC413', message = 'File exceeds the allowed size';
  end if;
  if p_file_name is null or length(trim(p_file_name)) = 0 or length(p_file_name) > 255
     or p_file_name ~ '[/\\[:cntrl:]]' then
    raise exception using errcode = 'IC422', message = 'Invalid file name';
  end if;
  if not files.resource_in_scope(p_account_id, p_entity_type, p_entity_id,
      p_account_wide, p_branch_ids, p_machine_ids) then
    raise exception using errcode = 'IC404', message = 'Related resource not found';
  end if;
  key := p_account_id::text || '/' || new_file::text || '/v1/' || gen_random_uuid()::text;
  expiry := now() + make_interval(secs => p_ttl_seconds);
  insert into files.file_objects (id, account_id, category, purpose, status, sensitivity, created_by, correlation_id)
  values (new_file, p_account_id, case when p_media_type = 'application/pdf' then 'PDF' else 'PHOTO' end,
    policy.purpose, 'PENDING_UPLOAD', policy.sensitivity, p_actor_user_id, p_correlation_id);
  insert into files.file_bindings (file_object_id, entity_type, entity_id, binding_role)
  values (new_file, p_entity_type, p_entity_id, 'ORIGINAL');
  insert into files.upload_sessions (file_object_id, account_id, created_by, idempotency_key, request_hash,
    token_hash, object_key, original_filename, media_type, declared_size_bytes, max_size_bytes,
    expires_at, correlation_id)
  values (new_file, p_account_id, p_actor_user_id, p_idempotency_key, p_request_hash, p_token_hash, key,
    p_file_name, p_media_type, p_size_bytes, policy.max_size_bytes, expiry, p_correlation_id);
  perform files.write_audit(p_actor_user_id, p_context_session_id, p_account_id, new_file,
    'FileUploadAuthorized', null,
    jsonb_build_object('purpose', policy.purpose, 'mediaType', p_media_type, 'sizeBytes', p_size_bytes,
      'entityType', p_entity_type, 'entityId', p_entity_id, 'expiresAt', expiry),
    null, 'SUCCESS', p_correlation_id);
  return query select new_file, key, expiry, policy.max_size_bytes, false;
end $$;

-- FIL-002. The caller passes what private storage reports for the object (null size when the
-- object does not exist). Mismatches reject the file; a missing object leaves it pending.
create function files.complete_upload(
  p_file_id uuid, p_account_id uuid, p_actor_user_id uuid, p_context_session_id uuid,
  p_token_hash text, p_observed_size bigint, p_observed_media_type text, p_declared_sha256 text,
  p_correlation_id uuid
) returns table (job_id uuid, file_status text, replayed boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  upload files.upload_sessions%rowtype;
  version_id uuid := gen_random_uuid();
  new_job uuid;
  policy_max integer;
  sent bigint;
begin
  select * into upload from files.upload_sessions s
    where s.file_object_id = p_file_id and s.account_id = p_account_id and s.created_by = p_actor_user_id
    for update;
  if upload.id is null then
    raise exception using errcode = 'IC404', message = 'Upload session not found';
  end if;
  if upload.token_hash <> p_token_hash then
    raise exception using errcode = 'IC422', message = 'Upload token does not match';
  end if;
  if upload.status = 'COMPLETED' then
    return query select upload.job_id, (select f.status::text from files.file_objects f where f.id = p_file_id), true;
    return;
  end if;
  if upload.status <> 'ISSUED' or upload.expires_at <= now() then
    raise exception using errcode = 'IC409', message = 'Upload session is closed or expired';
  end if;
  if p_declared_sha256 is not null and p_declared_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid SHA-256';
  end if;
  if p_observed_size is null then
    raise exception using errcode = 'IC422', message = 'Uploaded object not found';
  end if;
  if p_observed_size <> upload.declared_size_bytes or p_observed_size > upload.max_size_bytes
     or lower(split_part(coalesce(p_observed_media_type, ''), ';', 1)) <> upload.media_type then
    update files.upload_sessions s set status = 'REJECTED', completed_at = now(), updated_at = now()
      where s.id = upload.id;
    update files.file_objects f set status = 'REJECTED', closed_reason = 'UPLOAD_MISMATCH'
      where f.id = p_file_id;
    perform files.write_audit(p_actor_user_id, p_context_session_id, p_account_id, p_file_id,
      'FileUploadRejected', jsonb_build_object('status', 'PENDING_UPLOAD'),
      jsonb_build_object('status', 'REJECTED', 'declaredSizeBytes', upload.declared_size_bytes,
        'observedSizeBytes', p_observed_size, 'declaredMediaType', upload.media_type,
        'observedMediaType', left(p_observed_media_type, 150)),
      'Uploaded object does not match the authorized size or type', 'FAILED', p_correlation_id);
    return query select null::uuid, 'REJECTED'::text, false;
    return;
  end if;
  insert into files.file_versions (id, file_object_id, version_number, storage_zone, object_key,
    original_filename, media_type, size_bytes, scan_status, correlation_id)
  values (version_id, p_file_id, 1, 'QUARANTINE', upload.object_key, upload.original_filename,
    upload.media_type, p_observed_size, 'PENDING', p_correlation_id);
  update files.file_objects f set status = 'VERIFYING', current_version_id = version_id where f.id = p_file_id;
  -- Verification job for F5-09, visible through JOB-001 and the job center.
  select q.max_attempts into strict policy_max from infra.queue_policies q where q.queue_name = 'file_scans';
  insert into infra.async_jobs (job_type, account_id, source_type, source_id, idempotency_key,
    queue_name, status, max_attempts, event_type, correlation_id)
  values ('FILE_SCAN', p_account_id, 'FileVersion', version_id, 'file_scans:' || version_id,
    'file_scans', 'QUEUED', policy_max, 'FileUploadCompleted', p_correlation_id)
  returning id into new_job;
  perform infra.record_job_transition(new_job, null, 'QUEUED', 0, null);
  select pgmq.send('file_scans', jsonb_build_object('messageVersion', 1, 'jobId', new_job,
    'fileId', p_file_id, 'versionId', version_id, 'accountId', p_account_id,
    'declaredSha256', p_declared_sha256, 'correlationId', p_correlation_id)) into sent;
  update infra.async_jobs j set message_id = sent where j.id = new_job;
  update files.upload_sessions s set status = 'COMPLETED', completed_at = now(), updated_at = now(),
    declared_sha256 = p_declared_sha256, job_id = new_job where s.id = upload.id;
  perform files.write_audit(p_actor_user_id, p_context_session_id, p_account_id, p_file_id,
    'FileUploadCompleted', jsonb_build_object('status', 'PENDING_UPLOAD'),
    jsonb_build_object('status', 'VERIFYING', 'versionId', version_id, 'sizeBytes', p_observed_size,
      'mediaType', upload.media_type, 'storageZone', 'QUARANTINE', 'jobId', new_job),
    null, 'SUCCESS', p_correlation_id);
  return query select new_job, 'VERIFYING'::text, false;
end $$;

-- FIL-005. Repeating an abort is harmless.
create function files.abort_upload(
  p_file_id uuid, p_account_id uuid, p_actor_user_id uuid, p_context_session_id uuid,
  p_reason text, p_correlation_id uuid
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  upload files.upload_sessions%rowtype;
begin
  select * into upload from files.upload_sessions s
    where s.file_object_id = p_file_id and s.account_id = p_account_id and s.created_by = p_actor_user_id
    for update;
  if upload.id is null then
    raise exception using errcode = 'IC404', message = 'Upload session not found';
  end if;
  if upload.status = 'ABORTED' then
    return 'EXPIRED';
  end if;
  if upload.status <> 'ISSUED' then
    raise exception using errcode = 'IC409', message = 'Only pending uploads can be aborted';
  end if;
  update files.upload_sessions s set status = 'ABORTED', completed_at = now(), updated_at = now()
    where s.id = upload.id;
  update files.file_objects f set status = 'EXPIRED', closed_reason = 'ABORTED' where f.id = p_file_id;
  perform files.write_audit(p_actor_user_id, p_context_session_id, p_account_id, p_file_id,
    'FileUploadAborted', jsonb_build_object('status', 'PENDING_UPLOAD'),
    jsonb_build_object('status', 'EXPIRED'), nullif(left(trim(coalesce(p_reason, '')), 500), ''),
    'SUCCESS', p_correlation_id);
  return 'EXPIRED';
end $$;

-- Sessions not confirmed in time expire; their objects stay in quarantine until retention.
create function files.expire_upload_sessions() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  expired integer;
begin
  with closed as (
    update files.upload_sessions s set status = 'EXPIRED', updated_at = now()
    where s.status = 'ISSUED' and s.expires_at <= now()
    returning s.file_object_id
  )
  update files.file_objects f set status = 'EXPIRED', closed_reason = 'SESSION_EXPIRED'
  from closed where f.id = closed.file_object_id and f.status = 'PENDING_UPLOAD';
  get diagnostics expired = row_count;
  return expired;
end $$;

-- FIL-004. Authorizes one temporary read of the verified current version and audits it;
-- the API signs the URL afterwards. Download registry and history arrive with F5-10.
create function files.authorize_read(
  p_file_id uuid, p_account_id uuid, p_actor_user_id uuid, p_context_session_id uuid,
  p_account_wide boolean, p_branch_ids uuid[], p_machine_ids uuid[],
  p_purpose text, p_ttl_seconds integer, p_correlation_id uuid
) returns table (bucket_id text, object_key text, media_type text, file_name text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  file files.file_objects%rowtype;
  version files.file_versions%rowtype;
begin
  if p_ttl_seconds not between 30 and 900 then
    raise exception using errcode = '22023', message = 'Read URLs last at most 15 minutes';
  end if;
  if p_purpose is null or length(trim(p_purpose)) not between 3 and 120 then
    raise exception using errcode = '22023', message = 'A purpose is required';
  end if;
  if not files.file_visible(p_file_id, p_account_id, p_account_wide, p_branch_ids, p_machine_ids) then
    raise exception using errcode = 'IC404', message = 'File not found';
  end if;
  select * into strict file from files.file_objects f where f.id = p_file_id;
  select * into version from files.file_versions v where v.id = file.current_version_id;
  if file.status <> 'AVAILABLE' or version.id is null or version.available_at is null
     or version.scan_status <> 'CLEAN' or version.storage_zone = 'QUARANTINE' then
    perform files.write_audit(p_actor_user_id, p_context_session_id, p_account_id, p_file_id,
      'FileReadDenied', null, jsonb_build_object('status', file.status, 'purpose', p_purpose),
      'File is not available', 'DENIED', p_correlation_id);
    return;
  end if;
  perform files.write_audit(p_actor_user_id, p_context_session_id, p_account_id, p_file_id,
    'FileReadAuthorized', null,
    jsonb_build_object('versionId', version.id, 'purpose', p_purpose, 'ttlSeconds', p_ttl_seconds),
    null, 'SUCCESS', p_correlation_id);
  return query select case version.storage_zone when 'PRIVATE_ORIGINAL' then 'originals'
      when 'EXPORT' then 'exports' else 'derivatives' end,
    version.object_key::text, version.media_type::text, version.original_filename::text;
end $$;

-- Verification queue consumed by F5-09; same retry/DLQ policy model as domain events.
do $$
declare
  target_queue_name text;
begin
  foreach target_queue_name in array array['file_scans', 'file_scans_dlq']
  loop
    if not exists (select 1 from pgmq.list_queues() existing_queue
                   where existing_queue.queue_name = target_queue_name) then
      perform pgmq.create(target_queue_name);
    end if;
  end loop;
end
$$;
insert into infra.queue_policies (queue_name, dead_letter_queue, visibility_timeout_seconds, max_attempts)
values ('file_scans', 'file_scans_dlq', 120, 5)
on conflict (queue_name) do nothing;

select cron.unschedule(jobid) from cron.job where jobname = 'ice24_expire_upload_sessions';
select cron.schedule('ice24_expire_upload_sessions', '*/5 * * * *', 'select files.expire_upload_sessions()');

alter table files.upload_purposes enable row level security;
alter table files.file_objects enable row level security;
alter table files.file_versions enable row level security;
alter table files.file_bindings enable row level security;
alter table files.upload_sessions enable row level security;
revoke all on schema files from public, anon, authenticated;
revoke all on all tables in schema files from public, anon, authenticated, service_role;
revoke all on all functions in schema files from public, anon, authenticated, service_role;
grant usage on schema files to service_role;
-- The runtime reads metadata; every state change goes through the functions below.
grant select on files.upload_purposes, files.file_objects, files.file_versions, files.file_bindings
  to service_role;
-- Column grant: the one-time token hash and request fingerprint stay unreadable.
grant select (id, file_object_id, account_id, created_by, status, object_key, original_filename,
  media_type, declared_size_bytes, max_size_bytes, job_id, expires_at, completed_at, created_at)
  on files.upload_sessions to service_role;
grant execute on function
  files.create_upload_session(uuid, uuid, uuid, text, text, text, text, text, text, bigint, text, uuid,
    boolean, uuid[], uuid[], integer, uuid),
  files.complete_upload(uuid, uuid, uuid, uuid, text, bigint, text, text, uuid),
  files.abort_upload(uuid, uuid, uuid, uuid, text, uuid),
  files.authorize_read(uuid, uuid, uuid, uuid, boolean, uuid[], uuid[], text, integer, uuid),
  files.file_visible(uuid, uuid, boolean, uuid[], uuid[]),
  files.expire_upload_sessions()
  to service_role;

insert into authz.permissions (code, module_code, action_code, data_classification, description) values
  ('files.upload', 'files', 'CREATE', 'CONFIDENTIAL', 'Upload private files to authorized resources'),
  ('files.read', 'files', 'READ', 'CONFIDENTIAL', 'Read file metadata and request temporary private reads');
insert into authz.role_permissions (role_id, permission_id, effect)
select r.id, p.id, 'ALLOW' from authz.roles r cross join authz.permissions p
where (p.code = 'files.upload' and r.code in ('IA', 'OW', 'SA', 'TC', 'OP'))
   or (p.code = 'files.read' and r.code in ('IA', 'OW', 'SA', 'TC', 'OP', 'AU'));
