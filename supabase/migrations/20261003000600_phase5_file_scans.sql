-- F5-09: antivirus/integrity verification of quarantined uploads, consumed from `file_scans`.
-- The worker downloads the quarantined bytes, computes SHA-256, checks the file signature
-- against the authorized media type and asks the scanner adapter (ADR-019) for a verdict.
-- Every outcome goes through the functions below, which keep the file, its version, the job
-- registry and central audit consistent:
--   clean      -> version CLEAN in PRIVATE_ORIGINAL with its definitive hash, file AVAILABLE;
--   infected   -> version INFECTED, file REJECTED (MALWARE_DETECTED), security alert, bytes purged;
--   integrity  -> hash or signature mismatch, file REJECTED, security alert, bytes purged;
--   unavailable after the retry policy -> version FAILED, file QUARANTINED (fail closed).
-- Additive migration: widens two checks, adds `purged_at` and new functions.

alter table files.file_objects drop constraint file_objects_closed_reason_check;
alter table files.file_objects drop constraint file_objects_check;
alter table files.file_objects add constraint file_objects_closed_reason_check check (closed_reason in (
  'ABORTED','SESSION_EXPIRED','UPLOAD_MISMATCH','MALWARE_DETECTED','INTEGRITY_MISMATCH',
  'SIGNATURE_MISMATCH','SCAN_FAILED'));
alter table files.file_objects add constraint file_objects_check check (closed_reason is null
  or (status = 'EXPIRED' and closed_reason in ('ABORTED','SESSION_EXPIRED'))
  or (status = 'REJECTED' and closed_reason in ('UPLOAD_MISMATCH','MALWARE_DETECTED',
    'INTEGRITY_MISMATCH','SIGNATURE_MISMATCH'))
  or (status = 'QUARANTINED' and closed_reason = 'SCAN_FAILED'));

-- When the bytes of a rejected version were removed from the quarantine bucket.
alter table files.file_versions add column purged_at timestamptz;
alter table files.file_versions add constraint file_versions_purge_check check (purged_at is null
  or (storage_zone = 'QUARANTINE' and scan_status in ('INFECTED','FAILED') and available_at is null));

-- Same rules as F5-08, plus: the verdict of a finished scan and the purge mark are final.
create or replace function files.guard_file_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'File versions are append-only';
  end if;
  if (new.id, new.file_object_id, new.version_number, new.object_key, new.original_filename,
      new.media_type, new.size_bytes, new.created_at, new.correlation_id)
     is distinct from (old.id, old.file_object_id, old.version_number, old.object_key,
      old.original_filename, old.media_type, old.size_bytes, old.created_at, old.correlation_id)
     or (old.sha256 is not null and new.sha256 is distinct from old.sha256)
     or (old.purged_at is not null and new.purged_at is distinct from old.purged_at)
     or (old.available_at is not null and new.available_at is distinct from old.available_at)
     or (old.scan_status in ('CLEAN','INFECTED') and new.scan_details is distinct from old.scan_details) then
    raise exception using errcode = '55000', message = 'File version facts are immutable';
  end if;
  if new.scan_status is distinct from old.scan_status and not (
       (old.scan_status = 'PENDING' and new.scan_status in ('CLEAN','INFECTED','FAILED'))
    or (old.scan_status = 'FAILED' and old.purged_at is null and new.scan_status in ('PENDING','CLEAN','INFECTED'))
  ) then
    raise exception using errcode = 'IC409', message = 'Invalid scan transition';
  end if;
  if new.storage_zone is distinct from old.storage_zone
     and not (old.storage_zone = 'QUARANTINE' and new.storage_zone = 'PRIVATE_ORIGINAL' and new.scan_status = 'CLEAN') then
    raise exception using errcode = 'IC409', message = 'Only clean versions leave quarantine';
  end if;
  return new;
end $$;

-- Central audit written by the scan worker: no user actor, origin WORKER.
create function files.write_system_audit(
  p_account uuid, p_file uuid, p_operation text, p_previous jsonb, p_new jsonb,
  p_reason text, p_result text, p_correlation uuid
) returns void
language sql security definer set search_path = '' as $$
  insert into audit.events (event_version, occurred_at_utc, time_zone, actor_user_id, actor_type,
    context_session_id, account_id, entity_type, entity_id, operation, previous_values, new_values,
    reason, origin, result, correlation_id)
  values (1, now(), 'UTC', null, 'SYSTEM', null, p_account, 'FileObject', p_file, p_operation,
    p_previous, p_new, p_reason, 'WORKER', p_result, coalesce(p_correlation, gen_random_uuid()))
$$;

-- Starts (or resumes) the FILE_SCAN job of one delivery and tells the worker what to do:
-- SCAN the quarantined object, PURGE the bytes of an already rejected version, DONE when the
-- verdict was already recorded (duplicate delivery) or MISSING when the message does not match
-- a registered job. A version quarantined after exhausted retries goes back to VERIFYING when
-- support re-queues its job (INT-004).
create function files.scan_job_start(
  p_job_id uuid, p_version_id uuid, p_queue text, p_message_id bigint, p_attempt integer
) returns table (action text, file_id uuid, account_id uuid, object_key text, media_type text,
  size_bytes bigint, declared_sha256 text, correlation_id uuid)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  job infra.async_jobs%rowtype;
  version files.file_versions%rowtype;
  file files.file_objects%rowtype;
  declared text;
  next_action text;
begin
  select * into job from infra.async_jobs j
    where j.id = p_job_id and j.job_type = 'FILE_SCAN' and j.source_type = 'FileVersion'
      and j.source_id = p_version_id and j.queue_name = p_queue
    for update;
  if job.id is null then
    return query select 'MISSING'::text, null::uuid, null::uuid, null::text, null::text,
      null::bigint, null::text, null::uuid;
    return;
  end if;
  select * into strict version from files.file_versions v where v.id = p_version_id for update;
  select * into strict file from files.file_objects f where f.id = version.file_object_id for update;
  select s.declared_sha256 into declared from files.upload_sessions s where s.file_object_id = file.id;
  if version.scan_status in ('CLEAN','INFECTED') or file.status = 'REJECTED' then
    next_action := case when version.storage_zone = 'QUARANTINE' and version.purged_at is null
      and version.scan_status <> 'CLEAN' then 'PURGE' else 'DONE' end;
  else
    next_action := 'SCAN';
    if file.status = 'QUARANTINED' then
      update files.file_versions v set scan_status = 'PENDING' where v.id = version.id;
      update files.file_objects f set status = 'VERIFYING', closed_reason = null where f.id = file.id;
      perform files.write_system_audit(file.account_id, file.id, 'FileScanRequeued',
        jsonb_build_object('status', 'QUARANTINED', 'scanStatus', version.scan_status),
        jsonb_build_object('status', 'VERIFYING', 'scanStatus', 'PENDING', 'versionId', version.id,
          'jobId', job.id), null, 'SUCCESS', job.correlation_id);
    end if;
  end if;
  if job.status <> 'SUCCEEDED' then
    update infra.async_jobs j set status = 'RUNNING', attempt_count = p_attempt, message_id = p_message_id,
      started_at = now(), finished_at = null, next_attempt_at = null, error_code = null, error_detail_user = null
    where j.id = job.id;
    perform infra.record_job_transition(job.id, job.status, 'RUNNING', p_attempt, null);
  end if;
  return query select next_action, file.id, file.account_id, version.object_key::text,
    version.media_type::text, version.size_bytes, declared::text, job.correlation_id;
end $$;

-- Records the verdict for the scanned bytes. Repeating it for a finished version is a no-op
-- that returns the current file status.
create function files.scan_record_result(
  p_job_id uuid, p_version_id uuid, p_verdict text, p_sha256 text, p_details jsonb
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  job infra.async_jobs%rowtype;
  version files.file_versions%rowtype;
  file files.file_objects%rowtype;
  details jsonb;
begin
  if p_verdict not in ('CLEAN','INFECTED','INTEGRITY_MISMATCH','SIGNATURE_MISMATCH') then
    raise exception using errcode = '22023', message = 'Unknown scan verdict';
  end if;
  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'A computed SHA-256 is required';
  end if;
  if p_details is null or jsonb_typeof(p_details) <> 'object' or length(p_details::text) > 2000 then
    raise exception using errcode = '22023', message = 'Invalid scan details';
  end if;
  select * into job from infra.async_jobs j
    where j.id = p_job_id and j.job_type = 'FILE_SCAN' and j.source_id = p_version_id;
  if job.id is null then
    raise exception using errcode = 'IC404', message = 'Scan job not found';
  end if;
  select * into strict version from files.file_versions v where v.id = p_version_id for update;
  select * into strict file from files.file_objects f where f.id = version.file_object_id for update;
  if version.scan_status in ('CLEAN','INFECTED') or file.status <> 'VERIFYING' then
    return file.status;
  end if;
  details := p_details || jsonb_build_object('verdict', p_verdict, 'jobId', job.id, 'scannedAt', now());
  if p_verdict = 'CLEAN' then
    update files.file_versions v set sha256 = p_sha256, scan_status = 'CLEAN',
      storage_zone = 'PRIVATE_ORIGINAL', available_at = now(), scan_details = details
    where v.id = version.id;
    update files.file_objects f set status = 'AVAILABLE' where f.id = file.id;
    perform files.write_system_audit(file.account_id, file.id, 'FileScanCompleted',
      jsonb_build_object('status', 'VERIFYING', 'scanStatus', version.scan_status, 'storageZone', 'QUARANTINE'),
      jsonb_build_object('status', 'AVAILABLE', 'scanStatus', 'CLEAN', 'storageZone', 'PRIVATE_ORIGINAL',
        'versionId', version.id, 'sha256', p_sha256, 'engine', p_details ->> 'engine', 'jobId', job.id),
      null, 'SUCCESS', job.correlation_id);
    return 'AVAILABLE';
  end if;
  update files.file_versions v set sha256 = p_sha256,
    scan_status = case when p_verdict = 'INFECTED' then 'INFECTED' else 'FAILED' end,
    scan_details = details
  where v.id = version.id;
  update files.file_objects f set status = 'REJECTED',
    closed_reason = case p_verdict when 'INFECTED' then 'MALWARE_DETECTED' else p_verdict end
  where f.id = file.id;
  perform files.write_system_audit(file.account_id, file.id,
    case when p_verdict = 'INFECTED' then 'FileMalwareDetected' else 'FileIntegrityRejected' end,
    jsonb_build_object('status', 'VERIFYING', 'scanStatus', version.scan_status),
    jsonb_build_object('status', 'REJECTED', 'verdict', p_verdict, 'versionId', version.id,
      'sha256', p_sha256, 'engine', p_details ->> 'engine', 'signature', p_details ->> 'signature',
      'detectedMediaType', p_details ->> 'detectedMediaType', 'jobId', job.id),
    case p_verdict
      when 'INFECTED' then 'Malware detected by the antivirus scan'
      when 'INTEGRITY_MISMATCH' then 'Computed SHA-256 differs from the declared hash'
      else 'File content does not match the authorized media type' end,
    'FAILED', job.correlation_id);
  -- Security alert for consumers (notifications, F5-11) through the transactional outbox.
  insert into infra.outbox_events (event_type, aggregate_type, aggregate_id, aggregate_version,
    account_id, actor_type, payload, sensitivity, correlation_id, occurred_at)
  values ('FileSecurityAlertRaised', 'FileObject', file.id, file.row_version + 1, file.account_id,
    'SYSTEM', jsonb_build_object('fileId', file.id, 'versionId', version.id, 'verdict', p_verdict,
      'purpose', file.purpose, 'sha256', p_sha256, 'signature', p_details ->> 'signature'),
    'confidential', coalesce(job.correlation_id, gen_random_uuid()), now());
  return 'REJECTED';
end $$;

-- A delivery failed before a verdict (scanner or storage unavailable, timeout). Each attempt is
-- audited; once the retry policy is exhausted the file fails closed into QUARANTINED.
create function files.scan_record_failure(
  p_job_id uuid, p_version_id uuid, p_error_code text, p_attempt integer, p_dead_lettered boolean
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  job infra.async_jobs%rowtype;
  version files.file_versions%rowtype;
  file files.file_objects%rowtype;
begin
  if p_error_code is null or p_error_code !~ '^[A-Z][A-Z0-9_]{1,79}$' then
    raise exception using errcode = '22023', message = 'Invalid error code';
  end if;
  select * into job from infra.async_jobs j
    where j.id = p_job_id and j.job_type = 'FILE_SCAN' and j.source_id = p_version_id;
  if job.id is null then
    raise exception using errcode = 'IC404', message = 'Scan job not found';
  end if;
  select * into strict version from files.file_versions v where v.id = p_version_id for update;
  select * into strict file from files.file_objects f where f.id = version.file_object_id for update;
  if file.status <> 'VERIFYING' then
    return file.status;
  end if;
  perform files.write_system_audit(file.account_id, file.id, 'FileScanAttemptFailed', null,
    jsonb_build_object('versionId', version.id, 'jobId', job.id, 'attempt', p_attempt,
      'errorCode', p_error_code, 'retryScheduled', not p_dead_lettered),
    'Verification could not complete; the file stays in quarantine', 'FAILED', job.correlation_id);
  if not p_dead_lettered then
    return file.status;
  end if;
  update files.file_versions v set scan_status = 'FAILED',
    scan_details = jsonb_build_object('errorCode', p_error_code, 'attempts', p_attempt, 'jobId', job.id)
  where v.id = version.id;
  update files.file_objects f set status = 'QUARANTINED', closed_reason = 'SCAN_FAILED' where f.id = file.id;
  perform files.write_system_audit(file.account_id, file.id, 'FileQuarantined',
    jsonb_build_object('status', 'VERIFYING', 'scanStatus', version.scan_status),
    jsonb_build_object('status', 'QUARANTINED', 'scanStatus', 'FAILED', 'versionId', version.id,
      'jobId', job.id, 'errorCode', p_error_code, 'attempts', p_attempt),
    'Verification retries exhausted; the file remains blocked in quarantine', 'FAILED', job.correlation_id);
  return 'QUARANTINED';
end $$;

-- The worker removed the bytes of a rejected version from the quarantine bucket.
create function files.scan_record_purge(p_job_id uuid, p_version_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  job infra.async_jobs%rowtype;
  version files.file_versions%rowtype;
  file files.file_objects%rowtype;
begin
  select * into job from infra.async_jobs j
    where j.id = p_job_id and j.job_type = 'FILE_SCAN' and j.source_id = p_version_id;
  if job.id is null then
    raise exception using errcode = 'IC404', message = 'Scan job not found';
  end if;
  select * into strict version from files.file_versions v where v.id = p_version_id for update;
  select * into strict file from files.file_objects f where f.id = version.file_object_id;
  if version.purged_at is not null then
    return false;
  end if;
  if file.status <> 'REJECTED' or version.scan_status not in ('INFECTED','FAILED') then
    raise exception using errcode = 'IC409', message = 'Only rejected versions are purged';
  end if;
  update files.file_versions v set purged_at = now() where v.id = version.id;
  perform files.write_system_audit(file.account_id, file.id, 'FileObjectPurged', null,
    jsonb_build_object('versionId', version.id, 'bucket', 'quarantine', 'scanStatus', version.scan_status,
      'jobId', job.id), null, 'SUCCESS', job.correlation_id);
  return true;
end $$;

revoke all on function files.write_system_audit(uuid, uuid, text, jsonb, jsonb, text, text, uuid),
  files.scan_job_start(uuid, uuid, text, bigint, integer),
  files.scan_record_result(uuid, uuid, text, text, jsonb),
  files.scan_record_failure(uuid, uuid, text, integer, boolean),
  files.scan_record_purge(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function files.scan_job_start(uuid, uuid, text, bigint, integer),
  files.scan_record_result(uuid, uuid, text, text, jsonb),
  files.scan_record_failure(uuid, uuid, text, integer, boolean),
  files.scan_record_purge(uuid, uuid)
  to service_role;
