-- UXD-11: optional self-service profile fields. Reuse all existing identity fields.
alter table identity.users
  add column phone varchar(32),
  add column job_title varchar(120);
