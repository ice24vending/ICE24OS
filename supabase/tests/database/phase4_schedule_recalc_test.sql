begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;
select plan(8);
select has_column('equipment','schedule_jobs','kind','Calendar jobs distinguish template generation and recalculation');
select col_default_is('equipment','schedule_jobs','kind','template','Existing jobs remain template jobs');
select has_index('equipment','schedule_jobs','schedule_jobs_generation_key_key','One recalculation job per event and machine');
select has_column('equipment','scheduled_activities','component_catalog_id','Activities record their client component');
select has_column('equipment','scheduled_activities','alert_at','Activities record the effective alert instant');
select has_index('equipment','scheduled_activities','scheduled_activities_generation','Activity codes are unique per generation and component');
select is(
  (select count(*)::int from pg_constraint where conrelid='equipment.scheduled_activities'::regclass and contype='u'),
  0, 'The Phase 4 unique constraint was replaced by the component-aware index');
select ok(
  pg_get_functiondef('equipment.protect_history()'::regprocedure) like '%alert_at%',
  'Alert instant and component are immutable like the rest of the definition');
select * from finish();
rollback;
