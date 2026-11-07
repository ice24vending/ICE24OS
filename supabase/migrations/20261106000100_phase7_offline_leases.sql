-- Additive offline leases. Roll back routes/worker first, retain lease and request history.
create table maintenance.work_order_offline_leases (
 id uuid primary key default gen_random_uuid(), account_id uuid not null, order_id uuid not null,
 user_id uuid not null references identity.users(id), device_id uuid not null,
 downloaded_at timestamptz not null default now(), expires_at timestamptz not null,
 state text not null default 'active' check(state in ('active','released','expired','completed')),
 ended_at timestamptz, reason text,
 foreign key(order_id,account_id) references maintenance.work_orders(id,account_id),
 check(expires_at>downloaded_at), unique(id,account_id)
);
create unique index offline_one_active_order on maintenance.work_order_offline_leases(order_id) where state='active';
create index offline_leases_due on maintenance.work_order_offline_leases(expires_at) where state='active';
create table maintenance.offline_requests (
 account_id uuid not null references identity.accounts(id), actor_id uuid not null references identity.users(id),
 operation text not null, key text not null, digest text not null, response jsonb not null,
 created_at timestamptz not null default now(), primary key(account_id,actor_id,operation,key)
);
alter table maintenance.work_order_offline_leases enable row level security;
alter table maintenance.offline_requests enable row level security;
revoke all on maintenance.work_order_offline_leases,maintenance.offline_requests from public,anon,authenticated;
grant select,insert,update on maintenance.work_order_offline_leases to service_role;
grant select,insert on maintenance.offline_requests to service_role;
create trigger offline_requests_append_only before update or delete on maintenance.offline_requests for each row execute function audit.reject_event_mutation();
create trigger offline_requests_no_truncate before truncate on maintenance.offline_requests for each statement execute function audit.reject_event_mutation();

-- Older API instances must also respect a lease acquired by a newer instance.
create function maintenance.enforce_offline_lease() returns trigger language plpgsql as $$
begin
 if exists(select 1 from maintenance.work_order_offline_leases l where l.order_id=old.id
   and l.state='active' and l.expires_at>now()
   and l.id::text is distinct from current_setting('ice24.offline_lease',true)) then
   raise exception 'Orden bloqueada para trabajo sin conexión' using errcode='23514';
 end if;
 return new;
end $$;
create trigger work_order_offline_guard before update on maintenance.work_orders
for each row execute function maintenance.enforce_offline_lease();

create function maintenance.expire_offline_leases(batch_size integer, correlation uuid) returns integer
language plpgsql security definer set search_path=pg_catalog,maintenance as $$
declare lease record; affected integer := 0;
begin
 for lease in select l.*,w.branch_id,w.machine_id from maintenance.work_order_offline_leases l
   join maintenance.work_orders w on w.id=l.order_id where l.state='active' and l.expires_at<=now()
   order by l.expires_at limit greatest(1,least(batch_size,500)) for update of w,l skip locked
 loop
   update maintenance.work_order_offline_leases set state='expired',ended_at=now(),reason='Vigencia agotada' where id=lease.id;
   insert into audit.events(occurred_at_utc,time_zone,actor_type,account_id,branch_id,machine_id,
     entity_type,entity_id,operation,previous_values,new_values,reason,origin,result,correlation_id)
   values(now(),'UTC','SYSTEM',lease.account_id,lease.branch_id,lease.machine_id,'work_order',lease.order_id,
     'WorkOrderOfflineExpired',jsonb_build_object('leaseId',lease.id,'state','active'),
     jsonb_build_object('leaseId',lease.id,'state','expired'),'Vigencia agotada','WORKER','SUCCESS',correlation);
   affected := affected+1;
 end loop;
 return affected;
end $$;
revoke all on function maintenance.expire_offline_leases(integer,uuid) from public,anon,authenticated;
grant execute on function maintenance.expire_offline_leases(integer,uuid) to service_role;
