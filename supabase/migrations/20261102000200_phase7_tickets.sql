-- F7-02 expansion, expected duration seconds. Rollback: disable ticket routes and keep history.
-- Read contracts owned by equipment/files, consumed by tickets without object-storage access.
create view maintenance.ticket_machine_read as
select m.id,m.account_id,m.branch_id,m.machine_code,m.operational_status,t.definition
from equipment.machines m join equipment.template_versions t on t.id=m.template_id;
create view maintenance.ticket_catalog_read as
select id,kind,coalesce(data->>'name',code) as name from equipment.catalog_entries;
create view maintenance.ticket_component_read as
select m.id as machine_id,c.id,coalesce(c.data->>'name',c.code) as name
from equipment.machines m join equipment.template_versions t on t.id=m.template_id
join equipment.catalog_entries c on c.kind='component' and c.status='active'
  and (c.scope='OFFICIAL' or c.account_id=m.account_id)
left join equipment.machine_component_configs cfg on cfg.machine_id=m.id and cfg.component_catalog_id=c.id and cfg.valid_to is null
where cfg.status='active' or (cfg.id is null and t.definition->'components' @> to_jsonb(c.id::text));
create view files.ticket_evidence_read as
select f.id,f.account_id,f.purpose,f.status,b.entity_id as machine_id
from files.file_objects f join files.file_bindings b on b.file_object_id=f.id
where b.entity_type='MACHINE' and f.purpose in ('equipment_evidence','machine_photo');

create table maintenance.ticket_counters (
  account_id uuid primary key references identity.accounts(id), value bigint not null check(value>0)
);
create table maintenance.tickets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.accounts(id),
  branch_id uuid not null, machine_id uuid not null references equipment.machines(id),
  machine_code text not null, folio text not null,
  system_id uuid not null references equipment.catalog_entries(id), system_name text not null,
  component_id uuid references equipment.catalog_entries(id), component_name text,
  priority text not null check(priority in ('low','normal','high','critical')),
  description text not null check(length(trim(description)) between 10 and 4000),
  diagnosis text check(length(trim(diagnosis)) between 10 and 4000),
  state text not null default 'pending_assignment' check(state in ('pending_assignment','in_progress','completed','cancelled')),
  activity_id uuid references equipment.scheduled_activities(id),
  -- P3 will introduce the work-order FK before any writer can populate this reference.
  work_order_id uuid check(work_order_id is null),
  created_at timestamptz not null default now(), row_version integer not null default 1 check(row_version>0),
  foreign key(branch_id,account_id) references equipment.branches(id,account_id),
  unique(account_id,folio)
);
create index tickets_account_cursor on maintenance.tickets(account_id,id);
create index tickets_machine_cursor on maintenance.tickets(account_id,machine_id,id);
create table maintenance.ticket_evidence (
  ticket_id uuid not null references maintenance.tickets(id),
  file_id uuid not null references files.file_objects(id), primary key(ticket_id,file_id)
);
create table maintenance.ticket_idempotency (
  actor_id uuid not null references identity.users(id), account_id uuid not null references identity.accounts(id),
  operation text not null,key text not null,digest text not null,response jsonb not null,
  primary key(actor_id,account_id,operation,key)
);
create function maintenance.protect_ticket() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' then raise exception 'Tickets cannot be deleted'; end if;
  if (to_jsonb(new)-array['diagnosis','row_version']) is distinct from (to_jsonb(old)-array['diagnosis','row_version']) then
    raise exception 'Ticket identity and initial report are immutable';
  end if;
  new.row_version := old.row_version+1;
  return new;
end $$;
create trigger protect_ticket before update or delete on maintenance.tickets for each row execute function maintenance.protect_ticket();
create trigger tickets_no_truncate before truncate on maintenance.tickets for each statement execute function audit.reject_event_mutation();
create trigger ticket_evidence_immutable before update or delete or truncate on maintenance.ticket_evidence for each statement execute function audit.reject_event_mutation();
alter table maintenance.tickets enable row level security;
alter table maintenance.ticket_evidence enable row level security;
alter table maintenance.ticket_counters enable row level security;
alter table maintenance.ticket_idempotency enable row level security;
revoke all on all tables in schema maintenance from public,anon,authenticated;
revoke all on files.ticket_evidence_read from public,anon,authenticated;
grant select on maintenance.ticket_machine_read,maintenance.ticket_catalog_read,maintenance.ticket_component_read,files.ticket_evidence_read to service_role;
grant select,insert,update on maintenance.tickets,maintenance.ticket_counters to service_role;
grant select,insert on maintenance.ticket_evidence,maintenance.ticket_idempotency to service_role;
insert into authz.permissions(code,module_code,action_code,data_classification,description) values
('maintenance.tickets-read','maintenance','READ','CONFIDENTIAL','Read scoped tickets'),
('maintenance.tickets-create','maintenance','WRITE','CONFIDENTIAL','Report a fault on an authorized machine'),
('maintenance.tickets-edit','maintenance','WRITE','CONFIDENTIAL','Record ticket diagnosis with a reason');
insert into authz.role_permissions(role_id,permission_id,effect)
select r.id,p.id,'ALLOW' from authz.roles r cross join authz.permissions p
where (p.code='maintenance.tickets-read' and r.code in ('OW','OP','TC','AU','IO','IA'))
or (p.code='maintenance.tickets-create' and r.code in ('OW','OP','TC'))
or (p.code='maintenance.tickets-edit' and r.code in ('OW','OP','TC'));
