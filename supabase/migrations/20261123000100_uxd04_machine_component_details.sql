-- UXD-04: installation details belong to each version of a machine component.
-- Existing rows remain unknown: valid_from is a configuration date, not an installation date.
-- Expected duration: nullable columns without backfill; seconds under a brief table lock.
-- Reversal: prefer a forward fix after details have been recorded. Before first use, roll back
-- the API/UI release and drop these three columns. Do not discard populated technical history.
alter table equipment.machine_component_configs
  add column model text check (model is null or length(btrim(model)) between 1 and 200),
  add column installed_on date,
  add column warranty_until date,
  add constraint component_warranty_dates check (
    installed_on is null or warranty_until is null or warranty_until >= installed_on
  );
comment on column equipment.machine_component_configs.installed_on is
  'Recorded installation date; independent from the configuration version validity period.';
