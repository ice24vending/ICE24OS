-- UXD-02: branch metadata stays in data jsonb. No new columns or fabricated backfill.
create unique index branches_account_code_unique
  on equipment.branches (account_id, upper(data->>'code'))
  where nullif(data->>'code', '') is not null;
