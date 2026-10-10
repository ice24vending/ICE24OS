begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(7);
select has_table('equipment','machine_component_configs','Machine component configuration persists');
select has_index('equipment','machine_component_configs','machine_component_configs_open','One open version per machine and component');
select ok((select rowsecurity from pg_tables where schemaname='equipment' and tablename='machine_component_configs'),'Component configuration keeps RLS');
select ok(not has_table_privilege('authenticated','equipment.machine_component_configs','SELECT'),'Browser cannot read component configuration');
select ok(not has_table_privilege('service_role','equipment.machine_component_configs','DELETE'),'Service role cannot delete history');
select ok(exists(select 1 from pg_constraint where conrelid='equipment.machine_component_configs'::regclass and contype='x'),'Versions of a component never overlap');
select results_eq(
  $$select r.code::text from authz.role_permissions rp join authz.roles r on r.id=rp.role_id
    join authz.permissions p on p.id=rp.permission_id where p.code='equipment.machine-components-manage' order by 1$$,
  $$values ('OP'::text),('OW'::text)$$, 'Owner and branch Operator manage machine components');
select * from finish();
rollback;
