begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(9);
select has_table('equipment','maintenance_frequency_overrides','Client frequencies persist');
select has_index('equipment','maintenance_frequency_overrides','maintenance_frequency_overrides_open','One open version per target');
select ok((select rowsecurity from pg_tables where schemaname='equipment' and tablename='maintenance_frequency_overrides'),'Client frequencies keep RLS');
select ok(not has_table_privilege('authenticated','equipment.maintenance_frequency_overrides','SELECT'),'Browser cannot read client frequencies');
select ok(not has_table_privilege('service_role','equipment.maintenance_frequency_overrides','DELETE'),'Service role cannot delete warranty evidence');
select ok(exists(select 1 from pg_constraint where conrelid='equipment.maintenance_frequency_overrides'::regclass and contype='x'),'Versions of a target never overlap');
select col_not_null('equipment','maintenance_frequency_overrides','factory_frequencies','The factory value is kept with every override');
select results_eq(
  $$select r.code::text from authz.role_permissions rp join authz.roles r on r.id=rp.role_id
    join authz.permissions p on p.id=rp.permission_id where p.code='equipment.account-frequencies-manage' order by 1$$,
  $$values ('OW'::text)$$, 'Only the owner manages account frequencies');
select results_eq(
  $$select r.code::text from authz.role_permissions rp join authz.roles r on r.id=rp.role_id
    join authz.permissions p on p.id=rp.permission_id where p.code='equipment.machine-frequencies-manage' order by 1$$,
  $$values ('OP'::text),('OW'::text)$$, 'Owner and branch Operator manage machine frequencies');
select * from finish();
rollback;
