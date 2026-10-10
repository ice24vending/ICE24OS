-- TASK-F4-22 (RA-01): backfill the component configuration of machines activated before F4-19.
-- Every non-retired machine without any row in equipment.machine_component_configs receives the
-- components of its current template version as TEMPLATE_DEFAULT and active, exactly as the
-- F4-19 preload does at activation. No frequency override is created: the machine keeps the
-- ICE24 factory values (F4-20 resolution machine → account → template).
--
-- Calendars do not change. This migration only inserts configuration rows. It does not write
-- equipment.events (so no outbox event, no F4-21 recalculation job), scheduled_activities,
-- schedule_jobs or maintenance_frequency_overrides. Official components do not drive
-- activities (F4-21: template activities are not linked to components), so a later
-- recalculation computes the same dates with or without these rows.
--
-- Idempotent: machines that already have a configuration row (preloaded by F4-19, or changed
-- through the API) are skipped, so a second run inserts nothing.
--
-- Version time and actor: the start of the current template period or of the current ownership
-- period, whichever is later, and the actor of the ownership period (who activated the machine
-- or executed its transfer). The marker reason identifies the backfilled rows.
--
-- Expected duration: one insert-select over machines (Phase 4 volume: hundreds); seconds.
--
-- Reversal (operational, documented in docs/tasks/task-f4-22.md): prefer a forward fix. The
-- history trigger forbids deletes, so a reversal removes only backfilled rows nobody changed:
--   begin;
--   alter table equipment.machine_component_configs disable trigger component_config_history;
--   delete from equipment.machine_component_configs c
--   where c.reason = 'F4-22 backfill: componentes por defecto de la plantilla'
--     and c.row_version = 1 and c.valid_to is null
--     and not exists (select 1 from equipment.machine_component_configs n
--       where n.machine_id = c.machine_id and n.component_catalog_id = c.component_catalog_id
--         and n.id <> c.id);
--   alter table equipment.machine_component_configs enable trigger component_config_history;
--   commit;
-- Versions changed after the backfill are technical history and must be kept.

with candidates as (
  select m.id as machine_id, m.template_id, o.actor_id,
    greatest(o.valid_from, coalesce(t.valid_from, o.valid_from)) as valid_from
  from equipment.machines m
  join equipment.machine_periods o
    on o.machine_id = m.id and o.kind = 'ownership' and o.valid_to is null
  left join equipment.machine_periods t
    on t.machine_id = m.id and t.kind = 'template' and t.valid_to is null
  where m.operational_status <> 'retired'
    and not exists (
      select 1 from equipment.machine_component_configs c where c.machine_id = m.id)
), template_components as (
  select distinct c.machine_id, c.actor_id, c.valid_from, e.id as component_catalog_id
  from candidates c
  join equipment.template_versions v on v.id = c.template_id
  cross join lateral jsonb_array_elements_text(
    case when jsonb_typeof(v.definition -> 'components') = 'array'
      then v.definition -> 'components' else '[]'::jsonb end) as listed(value)
  join equipment.catalog_entries e
    on e.id::text = listed.value and e.kind = 'component' and e.scope = 'OFFICIAL'
)
insert into equipment.machine_component_configs
  (machine_id, component_catalog_id, origin, status, valid_from, actor_id, reason)
select machine_id, component_catalog_id, 'TEMPLATE_DEFAULT', 'active', valid_from, actor_id,
  'F4-22 backfill: componentes por defecto de la plantilla'
from template_components
order by machine_id, component_catalog_id;

-- Validation: every non-retired machine with an ownership period whose template lists official
-- components now has a configuration. Machines without ownership period cannot be attributed to
-- an actor and are reported, not changed.
do $$
declare missing integer; orphan integer;
begin
  select count(*) into missing
  from equipment.machines m
  join equipment.template_versions v on v.id = m.template_id
  where m.operational_status <> 'retired'
    and exists (select 1 from equipment.machine_periods o
      where o.machine_id = m.id and o.kind = 'ownership' and o.valid_to is null)
    and exists (select 1 from equipment.catalog_entries e
      where e.kind = 'component' and e.scope = 'OFFICIAL'
        and jsonb_typeof(v.definition -> 'components') = 'array'
        and v.definition -> 'components' ? e.id::text)
    and not exists (select 1 from equipment.machine_component_configs c where c.machine_id = m.id);
  if missing > 0 then
    raise exception 'F4-22 backfill left % machines without component configuration', missing;
  end if;
  select count(*) into orphan
  from equipment.machines m
  where m.operational_status <> 'retired'
    and not exists (select 1 from equipment.machine_periods o
      where o.machine_id = m.id and o.kind = 'ownership' and o.valid_to is null);
  if orphan > 0 then
    raise notice 'F4-22 backfill skipped % machines without an open ownership period', orphan;
  end if;
end $$;
