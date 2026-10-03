begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(38);

-- Privileges: the worker acts only through the scan functions.
select ok(
  has_function_privilege('service_role', 'files.scan_job_start(uuid, uuid, text, bigint, integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'files.scan_record_result(uuid, uuid, text, text, jsonb)', 'EXECUTE')
  and has_function_privilege('service_role', 'files.scan_record_failure(uuid, uuid, text, integer, boolean)', 'EXECUTE')
  and has_function_privilege('service_role', 'files.scan_record_purge(uuid, uuid)', 'EXECUTE')
  and not has_function_privilege('service_role', 'files.write_system_audit(uuid, uuid, text, jsonb, jsonb, text, text, uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'files.scan_record_result(uuid, uuid, text, text, jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'files.scan_job_start(uuid, uuid, text, bigint, integer)', 'EXECUTE')
  and not has_table_privilege('service_role', 'files.file_versions', 'UPDATE'),
  'Only the runtime role runs the scan functions; nobody updates versions directly'
);

insert into identity.accounts (id, name, account_type) values
  ('95000000-0000-4000-8000-00000000000a', 'Scans A', 'COMPANY');
insert into identity.users (id, identity_subject, username, email, display_name, status) values
  ('96000000-0000-4000-8000-000000000001', 'scans-owner', 'scans-owner', 'scans-owner@example.test', 'Owner', 'ACTIVE');
insert into equipment.branches (id, account_id, data) values
  ('97000000-0000-4000-8000-00000000000a', '95000000-0000-4000-8000-00000000000a', '{}');

-- Four confirmed uploads, each with its FILE_SCAN job and file_scans message.
create temp table uploads (label text primary key, file_id uuid, job_id uuid, version_id uuid) on commit drop;
do $$
declare
  label text;
  issued record;
  done record;
begin
  foreach label in array array['clean','infected','tampered','unavailable'] loop
    select * into issued from files.create_upload_session(
      '95000000-0000-4000-8000-00000000000a', '96000000-0000-4000-8000-000000000001', null,
      'scan-key-' || label, repeat('a', 64), encode(sha256(label::bytea), 'hex'),
      'equipment_evidence', label || '.png', 'image/png', 2048, 'BRANCH',
      '97000000-0000-4000-8000-00000000000a', true, '{}', '{}', 600, gen_random_uuid());
    select * into done from files.complete_upload(issued.file_id, '95000000-0000-4000-8000-00000000000a',
      '96000000-0000-4000-8000-000000000001', null, encode(sha256(label::bytea), 'hex'), 2048, 'image/png',
      null, null);
    insert into uploads select label, issued.file_id, done.job_id,
      (select current_version_id from files.file_objects where id = issued.file_id);
  end loop;
end $$;
create temp table deliveries on commit drop as
  select (message ->> 'jobId')::uuid as job_id, msg_id, read_ct from infra.read_queue('file_scans', 60, 100);
create function pg_temp.u(p_label text) returns uploads language sql as
  $$ select * from uploads where label = p_label $$;
create function pg_temp.msg(p_label text) returns bigint language sql as
  $$ select d.msg_id from deliveries d join uploads u on u.job_id = d.job_id where u.label = p_label $$;

select is((select count(*)::integer from deliveries where job_id in (select job_id from uploads)), 4,
  'Every confirmed upload has its message in file_scans');

-- Clean scan.
select is(
  (select action from files.scan_job_start((pg_temp.u('clean')).job_id, (pg_temp.u('clean')).version_id,
    'file_scans', pg_temp.msg('clean'), 1)),
  'SCAN', 'A pending version is scanned'
);
select results_eq(
  $$select status::text, attempt_count from infra.async_jobs where id = (pg_temp.u('clean')).job_id$$,
  $$values ('RUNNING'::text, 1)$$,
  'The job registry shows the scan running'
);
select is(
  (select action from files.scan_job_start((pg_temp.u('clean')).job_id, (pg_temp.u('infected')).version_id,
    'file_scans', pg_temp.msg('clean'), 1)),
  'MISSING', 'A message whose job and version do not match is not processed'
);
select throws_ok(
  $$select files.scan_record_result((pg_temp.u('clean')).job_id, (pg_temp.u('clean')).version_id,
    'MAYBE', repeat('b', 64), '{}')$$,
  '22023', 'Unknown scan verdict', 'Only known verdicts are accepted'
);
select throws_ok(
  $$select files.scan_record_result((pg_temp.u('clean')).job_id, (pg_temp.u('clean')).version_id,
    'CLEAN', null, '{}')$$,
  '22023', 'A computed SHA-256 is required', 'The definitive hash is mandatory'
);
select is(
  files.scan_record_result((pg_temp.u('clean')).job_id, (pg_temp.u('clean')).version_id, 'CLEAN',
    repeat('b', 64), '{"engine":"clamav"}'),
  'AVAILABLE', 'A clean verdict makes the file available'
);
select results_eq(
  $$select v.sha256::text, v.scan_status::text, v.storage_zone::text, v.available_at is not null,
      v.scan_details ->> 'verdict'
    from files.file_versions v where v.id = (pg_temp.u('clean')).version_id$$,
  $$values (repeat('b', 64), 'CLEAN'::text, 'PRIVATE_ORIGINAL'::text, true, 'CLEAN'::text)$$,
  'The clean version stores its hash and leaves quarantine'
);
select is(
  (select infra.job_finish((pg_temp.u('clean')).job_id, 'succeeded')), 'SUCCEEDED',
  'The scan job succeeds'
);
select results_eq(
  $$select bucket_id from files.authorize_read((pg_temp.u('clean')).file_id,
    '95000000-0000-4000-8000-00000000000a', '96000000-0000-4000-8000-000000000001', null, true, '{}', '{}',
    'Revisión', 300, null)$$,
  $$values ('originals'::text)$$,
  'The clean file is readable from the private originals bucket'
);
select is(
  files.scan_record_result((pg_temp.u('clean')).job_id, (pg_temp.u('clean')).version_id, 'INFECTED',
    repeat('c', 64), '{}'),
  'AVAILABLE', 'A repeated verdict does not change a finished scan'
);
select is(
  (select action from files.scan_job_start((pg_temp.u('clean')).job_id, (pg_temp.u('clean')).version_id,
    'file_scans', pg_temp.msg('clean'), 2)),
  'DONE', 'A duplicate delivery is acknowledged without scanning again'
);
select is((select status::text from infra.async_jobs where id = (pg_temp.u('clean')).job_id), 'SUCCEEDED',
  'A duplicate delivery does not reopen a succeeded job');
select throws_ok(
  $$update files.file_versions set scan_details = '{}' where id = (pg_temp.u('clean')).version_id$$,
  '55000', null, 'The verdict of a finished scan is immutable'
);

-- Infected: rejected, alerted, purged once.
select lives_ok(
  $$select files.scan_job_start((pg_temp.u('infected')).job_id, (pg_temp.u('infected')).version_id,
    'file_scans', pg_temp.msg('infected'), 1)$$,
  'The infected upload is picked up'
);
select is(
  files.scan_record_result((pg_temp.u('infected')).job_id, (pg_temp.u('infected')).version_id, 'INFECTED',
    repeat('d', 64), '{"engine":"clamav","signature":"Eicar-Test-Signature"}'),
  'REJECTED', 'Malware rejects the file'
);
select results_eq(
  $$select f.status::text, f.closed_reason::text, v.scan_status::text, v.storage_zone::text, v.available_at is null
    from files.file_objects f join files.file_versions v on v.id = f.current_version_id
    where f.id = (pg_temp.u('infected')).file_id$$,
  $$values ('REJECTED'::text, 'MALWARE_DETECTED'::text, 'INFECTED'::text, 'QUARANTINE'::text, true)$$,
  'The infected version never leaves quarantine'
);
select results_eq(
  $$select event_type::text, aggregate_type::text, actor_type, payload ->> 'verdict', payload ->> 'signature', sensitivity::text
    from infra.outbox_events where aggregate_id = (pg_temp.u('infected')).file_id$$,
  $$values ('FileSecurityAlertRaised'::text, 'FileObject'::text, 'SYSTEM'::text, 'INFECTED'::text,
    'Eicar-Test-Signature'::text, 'confidential'::text)$$,
  'A confidential security alert is published through the outbox'
);
select is(
  (select action from files.scan_job_start((pg_temp.u('infected')).job_id, (pg_temp.u('infected')).version_id,
    'file_scans', pg_temp.msg('infected'), 2)),
  'PURGE', 'A rejected version whose bytes remain asks for the purge'
);
select ok(
  files.scan_record_purge((pg_temp.u('infected')).job_id, (pg_temp.u('infected')).version_id)
  and not files.scan_record_purge((pg_temp.u('infected')).job_id, (pg_temp.u('infected')).version_id),
  'The purge is recorded once'
);
select is(
  (select action from files.scan_job_start((pg_temp.u('infected')).job_id, (pg_temp.u('infected')).version_id,
    'file_scans', pg_temp.msg('infected'), 3)),
  'DONE', 'Nothing is left to do after the purge'
);
select is(
  (select count(*)::integer from files.authorize_read((pg_temp.u('infected')).file_id,
    '95000000-0000-4000-8000-00000000000a', '96000000-0000-4000-8000-000000000001', null, true, '{}', '{}',
    'Revisión', 300, null)),
  0, 'An infected file cannot be read'
);
select throws_ok(
  $$select files.scan_record_purge((pg_temp.u('clean')).job_id, (pg_temp.u('clean')).version_id)$$,
  'IC409', null, 'A clean version is never purged'
);

-- Integrity failure: rejected without promotion; a purged version never returns to scanning.
select lives_ok(
  $$select files.scan_job_start((pg_temp.u('tampered')).job_id, (pg_temp.u('tampered')).version_id,
    'file_scans', pg_temp.msg('tampered'), 1)$$,
  'The tampered upload is picked up'
);
select is(
  files.scan_record_result((pg_temp.u('tampered')).job_id, (pg_temp.u('tampered')).version_id,
    'SIGNATURE_MISMATCH', repeat('e', 64), '{"engine":"integrity","detectedMediaType":null}'),
  'REJECTED', 'Content that does not match its media type is rejected'
);
select lives_ok(
  $$select files.scan_record_purge((pg_temp.u('tampered')).job_id, (pg_temp.u('tampered')).version_id)$$,
  'The tampered bytes are purged'
);
select throws_ok(
  $$update files.file_versions set scan_status = 'PENDING' where id = (pg_temp.u('tampered')).version_id$$,
  'IC409', null, 'A purged version cannot be scanned again'
);

-- Scanner unavailable: retries are audited, exhaustion fails closed, support can re-queue.
select lives_ok(
  $$select files.scan_job_start((pg_temp.u('unavailable')).job_id, (pg_temp.u('unavailable')).version_id,
    'file_scans', pg_temp.msg('unavailable'), 1)$$,
  'The upload is picked up while the scanner is down'
);
select is(
  files.scan_record_failure((pg_temp.u('unavailable')).job_id, (pg_temp.u('unavailable')).version_id,
    'SCANNER_TIMEOUT', 1, false),
  'VERIFYING', 'A temporary failure keeps the file verifying in quarantine'
);
select is(
  infra.fail_job('file_scans', pg_temp.msg('unavailable'), '{}'::jsonb || jsonb_build_object(
    'messageVersion', 1, 'jobId', (pg_temp.u('unavailable')).job_id), 5, 'SCANNER_TIMEOUT'),
  'dead_lettered', 'The retry policy dead-letters the fifth failure'
);
select is(
  files.scan_record_failure((pg_temp.u('unavailable')).job_id, (pg_temp.u('unavailable')).version_id,
    'SCANNER_TIMEOUT', 5, true),
  'QUARANTINED', 'Exhausted retries fail closed: the file stays blocked in quarantine'
);
select is(
  infra.job_finish((pg_temp.u('unavailable')).job_id, 'dead_lettered', 'SCANNER_TIMEOUT'),
  'DEAD_LETTER', 'The job registry shows the dead letter for support'
);
select is(
  (select count(*)::integer from files.authorize_read((pg_temp.u('unavailable')).file_id,
    '95000000-0000-4000-8000-00000000000a', '96000000-0000-4000-8000-000000000001', null, true, '{}', '{}',
    'Revisión', 300, null)),
  0, 'A quarantined file cannot be read'
);
select is(
  (select status::text from infra.retry_dead_letter_job((pg_temp.u('unavailable')).job_id,
    '96000000-0000-4000-8000-000000000001', null, 'Escáner restablecido tras la ventana de mantenimiento',
    'scan-retry-0001', null)),
  'QUEUED', 'Support re-queues the dead-lettered scan (INT-004)'
);
select is(
  (select action from files.scan_job_start((pg_temp.u('unavailable')).job_id,
    (pg_temp.u('unavailable')).version_id, 'file_scans',
    (select message_id from infra.async_jobs where id = (pg_temp.u('unavailable')).job_id), 1)),
  'SCAN', 'The re-queued message is scanned again'
);
select results_eq(
  $$select f.status::text, f.closed_reason is null, v.scan_status::text
    from files.file_objects f join files.file_versions v on v.id = f.current_version_id
    where f.id = (pg_temp.u('unavailable')).file_id$$,
  $$values ('VERIFYING'::text, true, 'PENDING'::text)$$,
  'The re-queued scan returns the file to verification'
);

-- Central audit of the scan worker: system actor, WORKER origin, correlation of the upload.
select results_eq(
  $$select a.operation::text, a.result::text from audit.events a
    where a.entity_id in (select file_id from uploads) and a.actor_type = 'SYSTEM' and a.origin = 'WORKER'
      and a.actor_user_id is null
    order by a.operation, a.result$$,
  $$values ('FileIntegrityRejected'::text, 'FAILED'::text), ('FileMalwareDetected', 'FAILED'),
    ('FileObjectPurged', 'SUCCESS'), ('FileObjectPurged', 'SUCCESS'), ('FileQuarantined', 'FAILED'),
    ('FileScanAttemptFailed', 'FAILED'), ('FileScanAttemptFailed', 'FAILED'),
    ('FileScanCompleted', 'SUCCESS'), ('FileScanRequeued', 'SUCCESS')$$,
  'Every scan outcome is in the central audit'
);
select * from finish();
rollback;
