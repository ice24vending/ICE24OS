begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(5);

select is(
  (select column_default from information_schema.columns
    where table_schema = 'identity' and table_name = 'accounts' and column_name = 'disabled_modules'),
  '''{}''::character varying[]',
  'Accounts start with every module enabled (SUP-14)'
);
select results_eq(
  $$select string_agg(r.code, ',' order by r.code) from authz.role_permissions rp
    join authz.roles r on r.id = rp.role_id join authz.permissions p on p.id = rp.permission_id
    where p.code = 'accounts.modules-manage'$$,
  $$values ('IA'::text)$$,
  'Only ICE24 administration configures modules (RF-ADM-010)'
);

insert into identity.accounts (id, name, account_type)
values ('f6000000-0000-4000-8000-000000000001', 'Cuenta pgTAP', 'COMPANY');
select lives_ok(
  $$update identity.accounts set disabled_modules = '{equipment,files}'
    where id = 'f6000000-0000-4000-8000-000000000001'$$,
  'Optional modules can be disabled'
);
select throws_ok(
  $$update identity.accounts set disabled_modules = '{identity}'
    where id = 'f6000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'Identity cannot be disabled'
);
select throws_ok(
  $$update identity.accounts set disabled_modules = '{subscriptions}'
    where id = 'f6000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'Billing cannot be disabled'
);

select * from finish();
rollback;
