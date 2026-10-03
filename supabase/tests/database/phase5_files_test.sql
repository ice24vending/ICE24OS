begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(31);

select has_table('files', 'file_objects', 'Logical file objects persist');
select has_table('files', 'file_versions', 'Immutable file versions persist');
select has_table('files', 'upload_sessions', 'Pre-authorized upload sessions persist');
select ok(
  (select bool_and(relrowsecurity) from pg_class where relnamespace = 'files'::regnamespace and relkind = 'r'),
  'Every files table has RLS'
);
select ok(
  not has_column_privilege('service_role', 'files.upload_sessions', 'token_hash', 'SELECT')
  and not has_column_privilege('service_role', 'files.upload_sessions', 'request_hash', 'SELECT')
  and has_column_privilege('service_role', 'files.upload_sessions', 'object_key', 'SELECT')
  and not has_table_privilege('service_role', 'files.file_objects', 'UPDATE')
  and not has_table_privilege('service_role', 'files.file_versions', 'INSERT')
  and not has_schema_privilege('authenticated', 'files', 'USAGE')
  and not has_schema_privilege('anon', 'files', 'USAGE'),
  'Token hashes are unreadable, state changes only through functions, browsers have no access'
);
select results_eq(
  $$select id, public from storage.buckets where id in ('quarantine','originals') order by id$$,
  $$values ('originals'::text, false), ('quarantine'::text, false)$$,
  'Upload and original buckets are private: no permanent public URLs'
);
select results_eq(
  $$select string_agg(purpose, ',' order by purpose) from files.upload_purposes$$,
  $$values ('document_original,equipment_evidence,laboratory_analysis_original,machine_photo'::text)$$,
  'Upload purposes mirror the contract'
);
select results_eq(
  $$select count(*) from authz.permissions where module_code = 'files'$$,
  $$values (2::bigint)$$,
  'File permissions are seeded'
);

insert into identity.accounts (id, name, account_type) values
  ('91000000-0000-4000-8000-00000000000a', 'Files A', 'COMPANY'),
  ('91000000-0000-4000-8000-00000000000b', 'Files B', 'COMPANY');
insert into identity.users (id, identity_subject, username, email, display_name, status) values
  ('92000000-0000-4000-8000-000000000001', 'files-owner', 'files-owner', 'files-owner@example.test', 'Owner', 'ACTIVE'),
  ('92000000-0000-4000-8000-000000000002', 'files-other', 'files-other', 'files-other@example.test', 'Other', 'ACTIVE');
insert into equipment.branches (id, account_id, data) values
  ('93000000-0000-4000-8000-00000000000a', '91000000-0000-4000-8000-00000000000a', '{}'),
  ('93000000-0000-4000-8000-00000000000b', '91000000-0000-4000-8000-00000000000b', '{}');

-- Session issuance and validation.
create temp table s1 on commit drop as select * from files.create_upload_session(
  '91000000-0000-4000-8000-00000000000a', '92000000-0000-4000-8000-000000000001', null,
  'upload-key-0001', repeat('a', 64), encode(sha256('token-1'), 'hex'),
  'equipment_evidence', 'foto.png', 'image/png', 2048, 'BRANCH', '93000000-0000-4000-8000-00000000000a',
  true, '{}', '{}', 900, '94000000-0000-4000-8000-000000000001');
select ok(
  (select object_key like '91000000-0000-4000-8000-00000000000a/' || file_id || '/v1/%' and not replayed
     and expires_at <= now() + interval '15 minutes' and max_size_bytes = 10485760 from s1),
  'The object key lives under the account and file prefix'
);
select is(
  (select status from files.file_objects where id = (select file_id from s1)), 'PENDING_UPLOAD',
  'A new file waits for its upload'
);
select is(
  (select file_id from files.create_upload_session(
    '91000000-0000-4000-8000-00000000000a', '92000000-0000-4000-8000-000000000001', null,
    'upload-key-0001', repeat('a', 64), encode(sha256('token-2'), 'hex'),
    'equipment_evidence', 'foto.png', 'image/png', 2048, 'BRANCH', '93000000-0000-4000-8000-00000000000a',
    true, '{}', '{}', 900, null)),
  (select file_id from s1), 'Replaying the idempotency key returns the same file'
);
select throws_ok(
  $$select * from files.create_upload_session('91000000-0000-4000-8000-00000000000a',
    '92000000-0000-4000-8000-000000000001', null, 'upload-key-0001', repeat('b', 64), repeat('c', 64),
    'equipment_evidence', 'otra.png', 'image/png', 10, 'BRANCH', '93000000-0000-4000-8000-00000000000a',
    true, '{}', '{}', 900, null)$$,
  'IC412', null, 'An idempotency key cannot be reused for another request'
);
select throws_ok(
  $$select * from files.create_upload_session('91000000-0000-4000-8000-00000000000a',
    '92000000-0000-4000-8000-000000000001', null, 'upload-key-0002', repeat('a', 64), repeat('c', 64),
    'equipment_evidence', 'grande.pdf', 'application/pdf', 10485761, 'BRANCH',
    '93000000-0000-4000-8000-00000000000a', true, '{}', '{}', 900, null)$$,
  'IC413', null, 'Files above the purpose limit are refused'
);
select throws_ok(
  $$select * from files.create_upload_session('91000000-0000-4000-8000-00000000000a',
    '92000000-0000-4000-8000-000000000001', null, 'upload-key-0003', repeat('a', 64), repeat('c', 64),
    'machine_photo', 'macro.png', 'application/pdf', 10, 'MACHINE',
    '93000000-0000-4000-8000-00000000000a', true, '{}', '{}', 900, null)$$,
  'IC415', null, 'Media types outside the purpose are refused'
);
select throws_ok(
  $$select * from files.create_upload_session('91000000-0000-4000-8000-00000000000a',
    '92000000-0000-4000-8000-000000000001', null, 'upload-key-0004', repeat('a', 64), repeat('c', 64),
    'equipment_evidence', 'ajena.png', 'image/png', 10, 'BRANCH', '93000000-0000-4000-8000-00000000000b',
    true, '{}', '{}', 900, null)$$,
  'IC404', null, 'A resource of another account cannot receive files'
);
select throws_ok(
  $$select * from files.create_upload_session('91000000-0000-4000-8000-00000000000a',
    '92000000-0000-4000-8000-000000000001', null, 'upload-key-0005', repeat('a', 64), repeat('c', 64),
    'document_original', 'cuenta.pdf', 'application/pdf', 10, 'ACCOUNT', '91000000-0000-4000-8000-00000000000a',
    false, array['93000000-0000-4000-8000-00000000000a']::uuid[], '{}', 900, null)$$,
  'IC404', null, 'Account-level files require account-wide scope'
);
select throws_ok(
  $$insert into files.file_versions (file_object_id, version_number, storage_zone, object_key, media_type, size_bytes)
    values ((select file_id from s1), 9, 'QUARANTINE',
      '91000000-0000-4000-8000-00000000000b/' || (select file_id from s1) || '/v9/94000000-0000-4000-8000-000000000009',
      'image/png', 1)$$,
  '23514', 'Object key outside the account scope', 'Keys outside the account prefix are rejected'
);

-- Confirmation.
select throws_ok(
  $$select * from files.complete_upload((select file_id from s1), '91000000-0000-4000-8000-00000000000a',
    '92000000-0000-4000-8000-000000000001', null, encode(sha256('token-1'), 'hex'), 2048, 'image/png', null, null)$$,
  'IC422', null, 'Only the latest one-time token confirms'
);
select throws_ok(
  $$select * from files.complete_upload((select file_id from s1), '91000000-0000-4000-8000-00000000000b',
    '92000000-0000-4000-8000-000000000001', null, encode(sha256('token-2'), 'hex'), 2048, 'image/png', null, null)$$,
  'IC404', null, 'Another account cannot confirm the upload'
);
select throws_ok(
  $$select * from files.complete_upload((select file_id from s1), '91000000-0000-4000-8000-00000000000a',
    '92000000-0000-4000-8000-000000000001', null, encode(sha256('token-2'), 'hex'), null, null, null, null)$$,
  'IC422', 'Uploaded object not found', 'A missing object cannot be confirmed'
);
create temp table c1 on commit drop as select * from files.complete_upload((select file_id from s1),
  '91000000-0000-4000-8000-00000000000a', '92000000-0000-4000-8000-000000000001', null,
  encode(sha256('token-2'), 'hex'), 2048, 'image/png', repeat('d', 64), '94000000-0000-4000-8000-000000000002');
select results_eq(
  $$select f.status::text, v.storage_zone::text, v.scan_status::text, v.available_at is null
    from files.file_objects f join files.file_versions v on v.id = f.current_version_id
    where f.id = (select file_id from s1)$$,
  $$values ('VERIFYING'::text, 'QUARANTINE'::text, 'PENDING'::text, true)$$,
  'The confirmed file stays in quarantine awaiting the antivirus'
);
select results_eq(
  $$select j.job_type::text, j.status::text, j.queue_name from infra.async_jobs j where j.id = (select job_id from c1)$$,
  $$values ('FILE_SCAN'::text, 'QUEUED'::text, 'file_scans'::text)$$,
  'A verification job is queued for F5-09'
);
select is(
  (select count(*)::integer from pgmq.q_file_scans where message ->> 'jobId' = (select job_id::text from c1)),
  1, 'The verification message is in its queue'
);
select is(
  (select job_id from files.complete_upload((select file_id from s1), '91000000-0000-4000-8000-00000000000a',
    '92000000-0000-4000-8000-000000000001', null, encode(sha256('token-2'), 'hex'), 2048, 'image/png', null, null)),
  (select job_id from c1), 'Repeating the confirmation returns the same job'
);
select throws_ok(
  $$update files.file_objects set status = 'AVAILABLE' where id = (select file_id from s1)$$,
  'IC409', null, 'A file cannot become available without a verified version'
);
select throws_ok(
  $$update files.file_versions set storage_zone = 'PRIVATE_ORIGINAL' where file_object_id = (select file_id from s1)$$,
  'IC409', null, 'Unscanned versions cannot leave quarantine'
);

-- Mismatch and temporary reads.
create temp table s2 on commit drop as select * from files.create_upload_session(
  '91000000-0000-4000-8000-00000000000a', '92000000-0000-4000-8000-000000000001', null,
  'upload-key-0006', repeat('e', 64), encode(sha256('token-3'), 'hex'),
  'laboratory_analysis_original', 'lab.pdf', 'application/pdf', 4096, 'BRANCH', '93000000-0000-4000-8000-00000000000a',
  true, '{}', '{}', 600, null);
select results_eq(
  $$select file_status, job_id is null from files.complete_upload((select file_id from s2),
    '91000000-0000-4000-8000-00000000000a', '92000000-0000-4000-8000-000000000001', null,
    encode(sha256('token-3'), 'hex'), 4096, 'text/html', null, null)$$,
  $$values ('REJECTED'::text, true)$$,
  'A different type than authorized rejects the file'
);
select is(
  (select count(*)::integer from files.authorize_read((select file_id from s1), '91000000-0000-4000-8000-00000000000a',
    '92000000-0000-4000-8000-000000000001', null, true, '{}', '{}', 'Revisión', 300, null)),
  0, 'Files awaiting verification cannot be read'
);
-- Simulated F5-09 promotion.
update files.file_versions set sha256 = repeat('f', 64), scan_status = 'CLEAN', storage_zone = 'PRIVATE_ORIGINAL',
  available_at = now() where file_object_id = (select file_id from s1);
update files.file_objects set status = 'AVAILABLE' where id = (select file_id from s1);
select results_eq(
  $$select bucket_id, object_key like '91000000-0000-4000-8000-00000000000a/%' from files.authorize_read(
    (select file_id from s1), '91000000-0000-4000-8000-00000000000a', '92000000-0000-4000-8000-000000000001',
    null, true, '{}', '{}', 'Revisión', 300, null)$$,
  $$values ('originals'::text, true)$$,
  'A verified file is readable from the private originals bucket'
);
select throws_ok(
  $$select * from files.authorize_read((select file_id from s1), '91000000-0000-4000-8000-00000000000b',
    '92000000-0000-4000-8000-000000000002', null, true, '{}', '{}', 'Revisión', 300, null)$$,
  'IC404', null, 'Another account cannot read the file'
);
select results_eq(
  $$select operation::text, result::text from audit.events where entity_id = (select file_id from s1)
    order by operation$$,
  $$values ('FileReadAuthorized'::text, 'SUCCESS'::text), ('FileReadDenied'::text, 'DENIED'::text),
    ('FileUploadAuthorized'::text, 'SUCCESS'::text), ('FileUploadCompleted'::text, 'SUCCESS'::text)$$,
  'Issuance, confirmation and reads are audited'
);
select * from finish();
rollback;
