begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(5);
select has_index('equipment','branches','branches_account_code_unique','Branch codes have a unique index');
insert into identity.accounts(id,name,account_type) values
 ('b0200000-0000-4000-8000-000000000001','UXD02 A','COMPANY'),
 ('b0200000-0000-4000-8000-000000000002','UXD02 B','COMPANY');
insert into equipment.branches(account_id,data) values
 ('b0200000-0000-4000-8000-000000000001','{"code":"CENTRO"}');
select throws_ok($$insert into equipment.branches(account_id,data) values
 ('b0200000-0000-4000-8000-000000000001','{"code":"centro"}')$$,
 '23505',null,'Codes are unique ignoring case within an account');
select lives_ok($$insert into equipment.branches(account_id,data) values
 ('b0200000-0000-4000-8000-000000000002','{"code":"CENTRO"}')$$,'Another account can reuse the code');
select lives_ok($$insert into equipment.branches(account_id,data) values
 ('b0200000-0000-4000-8000-000000000001','{}'),
 ('b0200000-0000-4000-8000-000000000001','{}')$$,'Legacy branches without code coexist');
select lives_ok($$insert into equipment.branches(account_id,data) values
 ('b0200000-0000-4000-8000-000000000001','{"code":""}'),
 ('b0200000-0000-4000-8000-000000000001','{"code":""}')$$,'Optional empty codes coexist');
select * from finish();
rollback;
