begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(9);
select has_column('equipment','catalog_entries','scope','Catalog entries declare their scope');
select has_column('equipment','catalog_entries','account_id','Account entries reference their owner');
select col_default_is('equipment','catalog_entries','scope','OFFICIAL','Entries default to OFFICIAL');
select has_index('equipment','catalog_entries','catalog_entries_official_code','Official codes are unique globally');
select has_index('equipment','catalog_entries','catalog_entries_account_code','Account codes are unique per account');
select ok((select rowsecurity from pg_tables where schemaname='equipment' and tablename='catalog_entries'),'Catalog entries keep RLS');
select ok(not has_table_privilege('authenticated','equipment.catalog_entries','SELECT'),'Browser cannot read catalog entries');
select throws_ok(
  $$insert into equipment.catalog_entries(kind,code,data,scope) values('component','PGTAP-ACCOUNT','{}','ACCOUNT')$$,
  '23514', null, 'ACCOUNT entries require an account');
select results_eq(
  $$select r.code::text from authz.role_permissions rp join authz.roles r on r.id=rp.role_id
    join authz.permissions p on p.id=rp.permission_id where p.code='equipment.catalog-manage'$$,
  $$values ('OW'::text)$$, 'Only the account owner manages account catalog entries');
select * from finish();
rollback;
