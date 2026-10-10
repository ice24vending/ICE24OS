-- TASK-F4-21 (RA-01, RF-TPL-016): recalculate calendars when components or frequencies change.
-- Additive: recalculation jobs reuse equipment.schedule_jobs with a deterministic key per event
-- and machine; scheduled activities record the catalog component of their activity and the
-- alert instant derived from the effective alert lead. Existing rows keep their values.
--
-- Expected duration: column additions without rewrite and one unique index on
-- scheduled_activities (built from existing rows); seconds for Phase 4 volumes.
--
-- Reversal (operational, documented in docs/tasks/task-f4-21.md): prefer a forward fix. If
-- needed before any recalculation ran:
--   drop index equipment.scheduled_activities_generation;
--   alter table equipment.scheduled_activities add unique (machine_id, generation_key, activity_code);
--   alter table equipment.scheduled_activities drop column component_catalog_id, drop column alert_at;
--   alter table equipment.schedule_jobs drop column kind, drop column generation_key,
--     drop column correlation_id;
-- and restore equipment.protect_history() from 20260917000100_phase4_equipment.sql.
-- Once recalculated activities exist they are schedule history and must be kept.

alter table equipment.schedule_jobs
  add column kind text not null default 'template' check (kind in ('template','recalc')),
  -- recalc:<eventId>:<machineId>; a redelivered event never enqueues a second job.
  add column generation_key text unique,
  add column correlation_id uuid,
  add constraint schedule_jobs_recalc_key check (kind = 'template' or generation_key is not null);
create index schedule_jobs_pending on equipment.schedule_jobs(created_at, id) where status = 'pending';

alter table equipment.scheduled_activities
  -- Set for the activity of a client component (RA-01-D3); its code may repeat a template code.
  add column component_catalog_id uuid references equipment.catalog_entries(id),
  -- due_at minus the effective alert lead; null without a lead or without a due date.
  add column alert_at timestamptz,
  add constraint scheduled_activities_alert check (alert_at is null or (due_at is not null and alert_at <= due_at));
-- The Phase 4 unique(machine_id,generation_key,activity_code) has a generated (truncated) name.
do $$
declare constraint_name text;
begin
  select c.conname into strict constraint_name from pg_constraint c
  where c.conrelid = 'equipment.scheduled_activities'::regclass and c.contype = 'u';
  execute format('alter table equipment.scheduled_activities drop constraint %I', constraint_name);
end $$;
create unique index scheduled_activities_generation on equipment.scheduled_activities(
  machine_id, generation_key, activity_code,
  coalesce(component_catalog_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index scheduled_activities_pending on equipment.scheduled_activities(machine_id, due_at)
  where status = 'pending';

-- Same rules as Phase 4, extended to the new columns: a scheduled definition never changes;
-- only its status moves (RF-TPL-007).
create or replace function equipment.protect_history() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op='DELETE' then raise exception 'History cannot be deleted'; end if;
  if tg_table_name='machine_periods' then
    if (to_jsonb(new) - 'valid_to') <> (to_jsonb(old) - 'valid_to') or old.valid_to is not null or new.valid_to is null then
      raise exception 'Only closing an open period is allowed';
    end if;
  elsif new.definition <> old.definition or new.template_id <> old.template_id or new.machine_id <> old.machine_id
    or new.activity_code <> old.activity_code or new.generation_key <> old.generation_key or new.due_at is distinct from old.due_at
    or new.component_catalog_id is distinct from old.component_catalog_id or new.alert_at is distinct from old.alert_at then
    raise exception 'Scheduled definitions are immutable';
  end if;
  return new;
end $$;
