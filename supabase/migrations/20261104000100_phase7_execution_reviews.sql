-- Additive P4/P5 expansion. Rollback application routes first; retain immutable history.
create table maintenance.work_order_executions (
 id uuid primary key default gen_random_uuid(), account_id uuid not null,
 order_id uuid not null, version integer not null check(version>0),
 kind text not null check(kind in ('draft','closure','correction')),
 actor_id uuid not null references identity.users(id), created_at timestamptz not null default now(),
 reason text not null, execution jsonb not null check(jsonb_typeof(execution)='object'),
 foreign key(order_id,account_id) references maintenance.work_orders(id,account_id),
 unique(order_id,version), unique(id,account_id)
);
create table maintenance.work_order_reviews (
 id uuid primary key default gen_random_uuid(), account_id uuid not null, order_id uuid not null,
 revision_id uuid, actor_id uuid not null references identity.users(id),
 action text not null check(action in ('review','correct','cancel','reopen','request_correction')),
 reason text not null check(length(trim(reason))>=5), created_at timestamptz not null default now(),
 foreign key(order_id,account_id) references maintenance.work_orders(id,account_id),
 foreign key(revision_id,account_id) references maintenance.work_order_executions(id,account_id)
);
create index work_order_reviews_history on maintenance.work_order_reviews(order_id,created_at,id);
create table maintenance.execution_files (
 revision_id uuid not null references maintenance.work_order_executions(id),
 file_id uuid not null references files.file_objects(id),
 file_version_id uuid not null references files.file_versions(id),
 primary key(revision_id,file_id)
);
create view files.work_order_evidence_read as
select f.id,f.account_id,f.status,b.entity_id as machine_id,v.id as version_id,
 v.media_type,v.size_bytes,v.sha256,v.scan_status,v.storage_zone,v.available_at,v.expires_at
from files.file_objects f join files.file_bindings b on b.file_object_id=f.id
join files.file_versions v on v.file_object_id=f.id
where b.entity_type='MACHINE' and f.purpose in ('equipment_evidence','machine_photo') and v.purged_at is null;
revoke all on files.work_order_evidence_read from public,anon,authenticated;
grant select on files.work_order_evidence_read to service_role;
alter table maintenance.work_order_executions enable row level security;
alter table maintenance.work_order_reviews enable row level security;
alter table maintenance.execution_files enable row level security;
revoke all on maintenance.work_order_executions,maintenance.work_order_reviews,maintenance.execution_files from public,anon,authenticated;
grant select,insert on maintenance.work_order_executions,maintenance.work_order_reviews,maintenance.execution_files to service_role;
create trigger executions_append_only before update or delete on maintenance.work_order_executions for each row execute function audit.reject_event_mutation();
create trigger executions_no_truncate before truncate on maintenance.work_order_executions for each statement execute function audit.reject_event_mutation();
create trigger reviews_append_only before update or delete on maintenance.work_order_reviews for each row execute function audit.reject_event_mutation();
create trigger reviews_no_truncate before truncate on maintenance.work_order_reviews for each statement execute function audit.reject_event_mutation();
create trigger execution_files_append_only before update or delete on maintenance.execution_files for each row execute function audit.reject_event_mutation();
create trigger execution_files_no_truncate before truncate on maintenance.execution_files for each statement execute function audit.reject_event_mutation();
