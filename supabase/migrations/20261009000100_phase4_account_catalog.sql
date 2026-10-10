-- TASK-F4-18 (RA-01, RF-TPL-013): official ICE24 catalog plus account-owned components and
-- characteristics. Additive (expand) change: existing rows become OFFICIAL and the previous
-- API keeps inserting OFFICIAL rows through the column default.
--
-- Expected duration: metadata-only column additions (non-volatile defaults) plus three index
-- builds over a small, ICE24-curated table; seconds at current volumes.
--
-- Reversal (operational, documented in docs/tasks/task-f4-18.md):
--   1. Prefer a forward fix. Rolling the API back below F4-18 while ACCOUNT rows exist is not
--      allowed: the previous GET /v1/catalogs selects every row and would expose them.
--   2. Only if `select count(*) from equipment.catalog_entries where scope='ACCOUNT'` is 0:
--        drop trigger catalog_entry_immutable on equipment.catalog_entries;
--        drop function equipment.protect_catalog_entry();
--        drop index equipment.catalog_entries_official_code, equipment.catalog_entries_account_code,
--          equipment.catalog_entries_account_list;
--        alter table equipment.catalog_entries add constraint catalog_entries_code_key unique(code),
--          drop constraint catalog_entries_scope_account, drop constraint catalog_entries_account_kind,
--          drop column scope, drop column account_id, drop column created_at, drop column updated_at;
--        delete from authz.role_permissions where permission_id in
--          (select id from authz.permissions where code='equipment.catalog-manage');
--        delete from authz.permissions where code='equipment.catalog-manage';

alter table equipment.catalog_entries
  add column scope text not null default 'OFFICIAL',
  add column account_id uuid references identity.accounts(id),
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

alter table equipment.catalog_entries
  add constraint catalog_entries_scope_check check (scope in ('OFFICIAL','ACCOUNT')),
  add constraint catalog_entries_scope_account check (
    (scope = 'OFFICIAL' and account_id is null) or (scope = 'ACCOUNT' and account_id is not null)
  ),
  -- Manufacturers and systems anchor official models and templates; accounts only extend
  -- components and characteristics.
  add constraint catalog_entries_account_kind check (
    scope = 'OFFICIAL' or kind in ('component','characteristic')
  );

-- Code uniqueness becomes per scope: global for OFFICIAL, per account for ACCOUNT.
alter table equipment.catalog_entries drop constraint catalog_entries_code_key;
create unique index catalog_entries_official_code on equipment.catalog_entries(code)
  where scope = 'OFFICIAL';
create unique index catalog_entries_account_code on equipment.catalog_entries(account_id, code)
  where scope = 'ACCOUNT';
-- Account listing: account_id + status filter, ordered by kind, code.
create index catalog_entries_account_list on equipment.catalog_entries(account_id, status, kind, code)
  where scope = 'ACCOUNT';

comment on column equipment.catalog_entries.scope is
  'OFFICIAL: ICE24 catalog, account_id null. ACCOUNT: visible and usable only by account_id.';

-- Identity of an entry (scope, owner, kind, code) is immutable and entries are never deleted;
-- withdrawal is status = retired.
create function equipment.protect_catalog_entry() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'Catalog entries cannot be deleted'; end if;
  if new.scope <> old.scope or new.account_id is distinct from old.account_id
    or new.kind <> old.kind or new.code <> old.code then
    raise exception 'Catalog entry identity is immutable';
  end if;
  return new;
end $$;
create trigger catalog_entry_immutable before update or delete on equipment.catalog_entries
for each row execute function equipment.protect_catalog_entry();

-- RA-01-D2: only the account owner (account-wide) manages account catalog entries.
insert into authz.permissions(code,module_code,action_code,data_classification,description) values
('equipment.catalog-manage','equipment','MANAGE','CONFIDENTIAL','Manage account-owned catalog components and characteristics');
insert into authz.role_permissions(role_id,permission_id,effect)
select r.id,p.id,'ALLOW' from authz.roles r join authz.permissions p on p.code='equipment.catalog-manage'
where r.code = 'OW';

-- Same access model as the rest of the schema: RLS enabled without browser policies, browser
-- roles revoked, service_role filtered by account in the API.
alter table equipment.catalog_entries enable row level security;
revoke all on equipment.catalog_entries from public, anon, authenticated;
revoke all on function equipment.protect_catalog_entry() from public, anon, authenticated;
grant execute on function equipment.protect_catalog_entry() to service_role;

do $$ begin
  if exists(select 1 from equipment.catalog_entries where scope <> 'OFFICIAL' or account_id is not null) then
    raise exception 'F4-18 validation failed: pre-existing catalog entries must be OFFICIAL';
  end if;
end $$;
