-- F7-03/04 additive migration. Expected duration: seconds. Rollback consumers first;
-- retain orders, frozen definitions and audit. Never delete historical records.
-- Equipment-owned contracts: machine/template snapshot and activity commands.
create view maintenance.work_order_machine_read as
select m.id,m.account_id,m.branch_id,m.machine_code,m.operational_status,
 t.id as template_id,t.version_number,t.definition,t.status as template_status
from equipment.machines m join equipment.template_versions t on t.id=m.template_id;
create view maintenance.work_order_activity_command as select * from equipment.scheduled_activities;
create view maintenance.work_order_template_read as select id,version_number from equipment.template_versions;
revoke all on maintenance.work_order_template_read from public,anon,authenticated;
grant select on maintenance.work_order_template_read to service_role;
create view maintenance.work_order_technician_read as
select u.id,u.display_name,m.id as membership_id,m.account_id
from identity.users u join identity.account_memberships m on m.user_id=u.id
where u.status='ACTIVE' and m.status='ACTIVE' and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())
and exists(select 1 from authz.membership_roles mr join authz.roles r on r.id=mr.role_id
 where mr.membership_id=m.id and r.code='TC' and r.status='ACTIVE' and mr.valid_from<=now() and (mr.valid_to is null or mr.valid_to>now()));
create table maintenance.work_order_counters(account_id uuid primary key references identity.accounts(id),value bigint not null check(value>0));
create table maintenance.work_orders (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references identity.accounts(id),
 branch_id uuid not null, machine_id uuid not null references equipment.machines(id), machine_code text not null,
 folio text not null, source_type text not null check(source_type in ('ticket','activity')), source_id uuid not null,
 ticket_id uuid references maintenance.tickets(id), activity_id uuid references equipment.scheduled_activities(id),
 assignee_id uuid not null references identity.users(id), assignee_name text not null,
 template_id uuid not null references equipment.template_versions(id), template_version integer not null check(template_version>0),
 definition jsonb not null check(jsonb_typeof(definition)='object'),
 state text not null check(state in ('scheduled','upcoming','overdue','in_progress','completed','with_observations','nonconforming','corrected','cancelled')),
 due_at timestamptz, alert_at timestamptz, row_version integer not null default 1 check(row_version>0), created_at timestamptz not null default now(),
 foreign key(branch_id,account_id) references equipment.branches(id,account_id),
 unique(id,account_id), unique(account_id,folio), unique(source_type,source_id), unique(ticket_id), unique(activity_id),
 check((source_type='ticket' and ticket_id is not null and ticket_id=source_id) or (source_type='activity' and activity_id is not null and activity_id=source_id and ticket_id is null))
);
create index work_orders_scope_cursor on maintenance.work_orders(account_id,branch_id,id);
create index work_orders_assignee_cursor on maintenance.work_orders(account_id,assignee_id,id);
create table maintenance.work_order_idempotency (
 actor_id uuid not null references identity.users(id), account_id uuid not null references identity.accounts(id),
 operation text not null,key text not null,digest text not null,response jsonb not null,
 primary key(actor_id,account_id,operation,key)
);
alter table maintenance.tickets drop constraint tickets_work_order_id_check;
alter table maintenance.tickets add constraint tickets_work_order_fk foreign key(work_order_id,account_id) references maintenance.work_orders(id,account_id);
create or replace function maintenance.protect_ticket() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'Tickets cannot be deleted'; end if;
 if (to_jsonb(new)-array['diagnosis','state','work_order_id','row_version']) is distinct from (to_jsonb(old)-array['diagnosis','state','work_order_id','row_version']) then
   raise exception 'Ticket identity and initial report are immutable';
 end if;
 if old.work_order_id is not null and new.work_order_id is distinct from old.work_order_id then raise exception 'Ticket order link is immutable'; end if;
 if old.work_order_id is not null and new.diagnosis is distinct from old.diagnosis then raise exception using errcode='23514',message='Assigned ticket diagnosis is frozen'; end if;
 new.row_version := old.row_version+1;
 return new;
end $$;
create function maintenance.protect_work_order() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'Orders cannot be deleted'; end if;
 if (to_jsonb(new)-array['assignee_id','assignee_name','state','row_version']) is distinct from (to_jsonb(old)-array['assignee_id','assignee_name','state','row_version']) then
   raise exception 'Order source and snapshot are immutable';
 end if;
 if new.assignee_id<>old.assignee_id and old.state not in ('scheduled','upcoming','overdue') then raise exception 'Started orders cannot be reassigned'; end if;
 new.row_version := old.row_version+1;
 return new;
end $$;
create trigger protect_work_order before update or delete on maintenance.work_orders for each row execute function maintenance.protect_work_order();
create trigger work_orders_no_truncate before truncate on maintenance.work_orders for each statement execute function audit.reject_event_mutation();
alter table maintenance.work_orders enable row level security;
alter table maintenance.work_order_counters enable row level security;
alter table maintenance.work_order_idempotency enable row level security;
revoke all on maintenance.work_orders,maintenance.work_order_counters,maintenance.work_order_idempotency,
 maintenance.work_order_machine_read,maintenance.work_order_activity_command,maintenance.work_order_technician_read from public,anon,authenticated;
grant select on maintenance.work_order_machine_read,maintenance.work_order_technician_read to service_role;
grant select,update on maintenance.work_order_activity_command to service_role;
grant select,insert,update on maintenance.work_orders,maintenance.work_order_counters to service_role;
grant select,insert on maintenance.work_order_idempotency to service_role;
insert into authz.permissions(code,module_code,action_code,data_classification,description) values
 ('maintenance.orders-read','maintenance','READ','CONFIDENTIAL','Read scoped work orders'),
 ('maintenance.orders-assign','maintenance','WRITE','CONFIDENTIAL','Assign scoped work orders'),
 ('maintenance.orders-execute','maintenance','WRITE','CONFIDENTIAL','Execute assigned work orders'),
 ('maintenance.orders-review','maintenance','WRITE','CONFIDENTIAL','Review work orders under provisional F7-D04');
insert into authz.role_permissions(role_id,permission_id,effect)
select r.id,p.id,'ALLOW' from authz.roles r cross join authz.permissions p
where (p.code='maintenance.orders-read' and r.code in ('OW','OP','TC','AU','IO','IA'))
or (p.code in ('maintenance.orders-assign','maintenance.orders-review') and r.code in ('OW','OP'))
or (p.code='maintenance.orders-execute' and r.code='TC');
