-- F7-01: expand existing calendar; no history rewrite. Expected duration: seconds on MVP data.
-- Rollback: roll back API/worker first; keep columns and history, remove read view/permission
-- only after no consumer uses them. Never delete scheduled activities to reverse a deployment.
create schema if not exists maintenance;
-- Unknown installation dates stay null; existing template activation remains the fallback.
alter table equipment.machines add column installed_at timestamptz;
alter table equipment.scheduled_activities
  add column assignee_id uuid references identity.users(id),
  add column row_version integer not null default 1 check (row_version > 0);

create index scheduled_activities_assignee_due on equipment.scheduled_activities(assignee_id,due_at,id);

create function maintenance.increment_activity_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.row_version := old.row_version + 1;
  return new;
end $$;
create trigger increment_activity_version before update on equipment.scheduled_activities
for each row execute function maintenance.increment_activity_version();

-- Public read contract between equipment and maintenance; only service credentials may read.
create view maintenance.scheduled_activity_read as
select a.id,m.account_id,m.branch_id,m.id as machine_id,m.machine_code,
  coalesce(m.data->>'internalName',m.data->>'name',m.machine_code) as machine_name,
  coalesce(b.data->>'name','Sucursal') as branch_name,
  coalesce(nullif(b.data->>'timezone',''),'America/Mexico_City') as timezone,
  a.activity_code,coalesce(a.definition->>'name',a.activity_code) as name,
  a.status,a.due_at,a.alert_at,a.assignee_id,a.row_version,
  coalesce(a.definition->>'criticality','normal') as criticality
from equipment.scheduled_activities a
join equipment.machines m on m.id=a.machine_id
join equipment.branches b on b.id=m.branch_id and b.account_id=m.account_id
where coalesce(a.definition->>'category','maintenance')='maintenance';
revoke all on schema maintenance from public,anon,authenticated;
revoke all on maintenance.scheduled_activity_read from public,anon,authenticated;
grant usage on schema maintenance to service_role;
grant select on maintenance.scheduled_activity_read to service_role;

insert into authz.permissions(code,module_code,action_code,data_classification,description)
values('maintenance.read','maintenance','READ','CONFIDENTIAL','Read scheduled maintenance within the authorized scope');
insert into authz.role_permissions(role_id,permission_id,effect)
select r.id,p.id,'ALLOW' from authz.roles r join authz.permissions p on p.code='maintenance.read'
where r.code in ('OW','OP','TC','AU','IO','IA');

alter table identity.accounts drop constraint accounts_disabled_modules_check;
alter table identity.accounts add constraint accounts_disabled_modules_check
check (disabled_modules <@ array['equipment','files','maintenance']::varchar(60)[]);
