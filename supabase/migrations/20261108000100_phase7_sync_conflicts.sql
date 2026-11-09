-- Additive F7-13/15. Roll back API/UI first; retain immutable snapshots and resolutions.
create table maintenance.synchronization_conflicts (
 id uuid primary key default gen_random_uuid(), account_id uuid not null,
 order_id uuid not null, operation_id uuid not null, actor_id uuid not null references identity.users(id),
 device_id uuid not null, local_snapshot jsonb not null, server_snapshot jsonb not null,
 disputed_fields jsonb not null, created_at timestamptz not null default now(),
 foreign key(order_id,account_id) references maintenance.work_orders(id,account_id),
 unique(account_id,actor_id,operation_id), unique(id,account_id)
);
create table maintenance.synchronization_resolutions (
 conflict_id uuid primary key, account_id uuid not null, actor_id uuid not null references identity.users(id),
 strategy text not null check(strategy in ('server','local','combine')), reason text not null check(length(trim(reason))>=5),
 choices jsonb, order_version integer not null, created_at timestamptz not null default now(),
 foreign key(conflict_id,account_id) references maintenance.synchronization_conflicts(id,account_id)
);
create index synchronization_conflicts_context on maintenance.synchronization_conflicts(account_id,order_id,created_at);
alter table maintenance.synchronization_conflicts enable row level security;
alter table maintenance.synchronization_resolutions enable row level security;
revoke all on maintenance.synchronization_conflicts,maintenance.synchronization_resolutions from public,anon,authenticated;
grant select,insert on maintenance.synchronization_conflicts,maintenance.synchronization_resolutions to service_role;
create trigger synchronization_conflicts_immutable before update or delete on maintenance.synchronization_conflicts for each row execute function audit.reject_event_mutation();
create trigger synchronization_conflicts_no_truncate before truncate on maintenance.synchronization_conflicts for each statement execute function audit.reject_event_mutation();
create trigger synchronization_resolutions_immutable before update or delete on maintenance.synchronization_resolutions for each row execute function audit.reject_event_mutation();
create trigger synchronization_resolutions_no_truncate before truncate on maintenance.synchronization_resolutions for each statement execute function audit.reject_event_mutation();
-- Self-reported cleanup receipts contain identifiers only, never draft/evidence contents.
create table maintenance.offline_purge_receipts (
 id uuid primary key, actor_id uuid not null references identity.users(id), report jsonb not null,
 created_at timestamptz not null default now()
);
alter table maintenance.offline_purge_receipts enable row level security;
revoke all on maintenance.offline_purge_receipts from public,anon,authenticated;
grant select,insert on maintenance.offline_purge_receipts to service_role;
create trigger offline_purge_receipts_immutable before update or delete on maintenance.offline_purge_receipts for each row execute function audit.reject_event_mutation();
create trigger offline_purge_receipts_no_truncate before truncate on maintenance.offline_purge_receipts for each statement execute function audit.reject_event_mutation();
