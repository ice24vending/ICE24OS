begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(23);
select has_table('files','download_events','Download events persist');
select ok((select bool_and(relrowsecurity) from pg_class where oid in ('files.download_events'::regclass,'files.download_sessions'::regclass)), 'RLS on download tables');
select ok(not has_table_privilege('service_role','files.download_events','INSERT')
  and not has_table_privilege('service_role','files.download_events','UPDATE')
  and not has_table_privilege('service_role','files.download_events','DELETE')
  and not has_table_privilege('service_role','files.download_sessions','SELECT'), 'Runtime cannot forge history or enumerate sessions');
select ok(not has_function_privilege('anon','files.prepare_download(uuid,uuid,uuid,uuid,boolean,uuid[],uuid[],text,integer,uuid)','EXECUTE')
  and not has_function_privilege('authenticated','files.finish_download(uuid,uuid,uuid,boolean,uuid[],uuid[],text)','EXECUTE'), 'Clients cannot authorize or finalize downloads');
insert into identity.accounts(id,name,account_type) values ('a1000000-0000-4000-8000-000000000001','Download A','COMPANY'),('a1000000-0000-4000-8000-000000000002','Download B','COMPANY');
insert into identity.users(id,identity_subject,username,email,display_name,status) values
 ('a2000000-0000-4000-8000-000000000001','downloads-user','downloads-user','downloads@example.test','Downloads','ACTIVE');
insert into files.file_objects(id,account_id,category,purpose,status,sensitivity,created_by) values
 ('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','PDF','document_original','VERIFYING','SENSITIVE','a2000000-0000-4000-8000-000000000001');
insert into files.file_versions(id,file_object_id,version_number,storage_zone,object_key,original_filename,media_type,size_bytes,sha256,scan_status,available_at) values
 ('a4000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001',1,'PRIVATE_ORIGINAL',
 'a1000000-0000-4000-8000-000000000001/a3000000-0000-4000-8000-000000000001/v1/a5000000-0000-4000-8000-000000000001','document.pdf','application/pdf',100,repeat('a',64),'CLEAN',now());
update files.file_objects set current_version_id='a4000000-0000-4000-8000-000000000001',status='AVAILABLE' where id='a3000000-0000-4000-8000-000000000001';
insert into files.file_bindings(file_object_id,entity_type,entity_id,binding_role) values
 ('a3000000-0000-4000-8000-000000000001','ACCOUNT','a1000000-0000-4000-8000-000000000001','ORIGINAL');
create function pg_temp.prepare(p_account uuid default 'a1000000-0000-4000-8000-000000000001', p_ttl int default 300)
returns table(outcome text,session_id uuid,bucket_id text,object_key text,file_name text,expires_at timestamptz)
language sql as $$ select * from files.prepare_download('a3000000-0000-4000-8000-000000000001',p_account,
 'a2000000-0000-4000-8000-000000000001',null,true,'{}','{}','Revisión',p_ttl,'a6000000-0000-4000-8000-000000000001') $$;
create function pg_temp.finish(sid uuid, result text default 'AUTHORIZED',wide boolean default true)
returns text language sql as $$ select files.finish_download(sid,'a1000000-0000-4000-8000-000000000001',
 'a2000000-0000-4000-8000-000000000001',wide,'{}','{}',result) $$;
select throws_ok($$select * from pg_temp.prepare(p_ttl=>301)$$,'22023','Invalid download authorization','TTL cannot exceed 5 minutes');
select throws_ok($$select * from pg_temp.prepare(p_ttl=>null)$$,'22023','Invalid download authorization','Null TTL cannot bypass validation');
select is((select outcome from pg_temp.prepare('a1000000-0000-4000-8000-000000000002')),'NOT_FOUND','Cross-account identifiers do not disclose existence');
select is((select count(*)::int from audit.events where entity_id='a3000000-0000-4000-8000-000000000001' and operation='FileReadDenied'),1,'Cross-account denial persists in audit');
create temp table s1 as select * from pg_temp.prepare();
select is((select outcome from s1),'AUTHORIZED','Clean private file authorized');
select ok((select expires_at<=now()+interval '5 minutes' and bucket_id='originals' from s1),'Short lifetime and private bucket');
select is((select pg_temp.finish(session_id) from s1),'AUTHORIZED','Signed issuance recorded');
select is((select pg_temp.finish(session_id,'ERROR') from s1),'AUTHORIZED','Finalization is idempotent');
select is((select count(*)::int from files.download_events where session_id=(select session_id from s1)),1,'One terminal event per session');
select throws_ok($$update files.download_events set result='ERROR' where session_id=(select session_id from s1)$$,'23514','Download history is append-only','No rewriting history');
select throws_ok($$delete from files.download_events where session_id=(select session_id from s1)$$,'23514','Download history is append-only','No deleting history');
select throws_ok($$update files.download_sessions set purpose='Changed' where id=(select session_id from s1)$$,'23514','Download history is append-only','Authorization facts immutable');
create temp table s2 as select * from pg_temp.prepare();
select is((select pg_temp.finish(session_id,'ERROR') from s2),'ERROR','Signing failure recorded');
create temp table s3 as select * from pg_temp.prepare();
select is((select pg_temp.finish(session_id,'AUTHORIZED',false) from s3),'DENIED','Scope checked again before issuance');
update files.file_versions set expires_at=now()+interval '40 seconds' where id='a4000000-0000-4000-8000-000000000001';
create temp table s4 as select * from pg_temp.prepare();
select ok((select expires_at<=now()+interval '40 seconds' from s4),'File lifetime caps URL authorization');
update files.file_versions set expires_at=now()-interval '1 second' where id='a4000000-0000-4000-8000-000000000001';
select is((select pg_temp.finish(session_id) from s4),'EXPIRED','Expiry during signing prevents URL delivery');
select is((select outcome from pg_temp.prepare()),'UNAVAILABLE','Expired version cannot be signed again');
select is((select count(*)::int from files.download_events where result='EXPIRED' and file_version_id='a4000000-0000-4000-8000-000000000001'),2,'Both expiry paths recorded');
select ok((select bool_and(new_values ? 'versionId' and new_values ? 'result' and correlation_id is not null and actor_user_id is not null)
 from audit.events where entity_id='a3000000-0000-4000-8000-000000000001' and operation='FileDownloadRecorded'),'Audit retains version, result, actor and correlation');
select * from finish();
rollback;
